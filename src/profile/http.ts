import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ProfileError } from "./errors";
import { publicProfile } from "./contracts";
import { readBoundedBody, readResumeInput } from "./intake";
import {
  getProfileRuntime,
  getDemoProfileRuntime,
  type ProfileRuntime,
} from "./runtime";

export function checkOrigin(request: Request) {
  const expected = new URL(process.env.APP_BASE_URL || request.url);
  const origin = request.headers.get("origin");
  // Next may normalize Request.url to localhost; the Host header preserves the
  // authority the browser actually used. A configured canonical origin wins.
  if (!process.env.APP_BASE_URL && request.headers.get("host")) {
    expected.host = request.headers.get("host")!;
  }
  if (
    origin !== expected.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new ProfileError(
      "INVALID_ORIGIN",
      403,
      "This action must come from the application.",
    );
  }
}
export async function respond(work: () => Promise<unknown>, status = 200) {
  try {
    return Response.json(await work(), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const safe =
      error instanceof ProfileError
        ? error
        : new ProfileError(
            "INTERNAL_ERROR",
            500,
            "This request could not be completed. Please retry.",
            true,
          );
    return Response.json(
      {
        error: {
          code: safe.code,
          message: safe.message,
          retryable: safe.retryable,
          requestId: randomUUID(),
        },
      },
      { status: safe.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
const key = (r: Request) => {
  const value = r.headers.get("idempotency-key") ?? "";
  if (!/^[\w-]{8,100}$/.test(value))
    throw new ProfileError(
      "IDEMPOTENCY_REQUIRED",
      400,
      "Provide a valid Idempotency-Key.",
    );
  return value;
};
const profileId = (id: string) => {
  if (!z.uuid().safeParse(id).success)
    throw new ProfileError("NOT_FOUND", 404, "This profile is unavailable.");
  return id;
};
export function createProfileHandlers(
  runtime: () => ProfileRuntime = getProfileRuntime,
) {
  return {
    post: (request: Request) =>
      respond(async () => {
        checkOrigin(request);
        const dependencies = runtime();
        const owner = await dependencies.authorize(request, "write");
        const requestKey = key(request);
        const text = await readResumeInput(request);
        await dependencies.authorizeIntake(owner, text, request);
        return publicProfile(
          await dependencies.service.intake(owner, requestKey, text),
        );
      }, 201),
    get: (request: Request, id: string) =>
      respond(async () => {
        const dependencies = runtime();
        const owner = await dependencies.authorize(request, "read");
        return publicProfile(
          await dependencies.service.get(owner, profileId(id)),
        );
      }),
    patch: (request: Request, id: string) =>
      respond(async () => {
        checkOrigin(request);
        const dependencies = runtime();
        const owner = await dependencies.authorize(request, "write");
        const requestKey = key(request);
        if (
          !request.headers.get("content-type")?.startsWith("application/json")
        )
          throw new ProfileError("INVALID_INPUT", 415, "Use JSON corrections.");
        let input: unknown;
        try {
          input = JSON.parse(
            new TextDecoder().decode(await readBoundedBody(request, 64 * 1024)),
          );
        } catch (error) {
          if (error instanceof ProfileError) throw error;
          throw new ProfileError(
            "INVALID_INPUT",
            400,
            "Invalid JSON corrections.",
          );
        }
        return publicProfile(
          await dependencies.service.update(
            owner,
            profileId(id),
            requestKey,
            input,
          ),
        );
      }),
    suggestions: (request: Request, id: string) =>
      respond(async () => {
        const dependencies = runtime();
        const owner = await dependencies.authorize(request, "read");
        const query = z
          .strictObject({
            pathId: z.string().min(1).max(100),
            version: z.coerce.number().int().positive(),
          })
          .safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success)
          throw new ProfileError(
            "INVALID_INPUT",
            400,
            "Provide a reviewed path and profile version.",
          );
        return dependencies.service.suggestions(
          owner,
          profileId(id),
          query.data.pathId,
          query.data.version,
        );
      }),
  };
}
export const profileHandlers = createProfileHandlers();

export const demoProfileHandlers = createProfileHandlers(getDemoProfileRuntime);
