import { z } from "zod";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { checkOrigin, respond } from "@/profile/http";
import { readBoundedBody } from "@/profile/intake";
import { ProfileError } from "@/profile/errors";
import { OpportunityError } from "@/opportunities/engine";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(async () => {
    try {
      checkOrigin(request);
      const platform = getPlatformServices();
      const owner = await platform.authorize(true);
      const key = request.headers.get("idempotency-key") ?? "";
      if (!/^[\w-]{8,100}$/.test(key))
        throw new ProfileError(
          "IDEMPOTENCY_REQUIRED",
          400,
          "Provide an idempotency key.",
        );
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        throw new ProfileError("INVALID_INPUT", 415, "Use JSON.");
      const body = JSON.parse(
        new TextDecoder().decode(await readBoundedBody(request, 4096)),
      );
      const input = z
        .object({
          profileId: z.uuid(),
          profileVersion: z.number().int().positive(),
          catalogVersion: z.string().min(1).max(120),
        })
        .strict()
        .parse(body);
      return platform.career.analyze(
        owner,
        input.profileId,
        input.profileVersion,
        input.catalogVersion,
        key,
      );
    } catch (error) {
      if (error instanceof OpportunityError)
        throw new ProfileError(error.code, error.status, error.message);
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        throw new ProfileError(
          "INVALID_INPUT",
          400,
          "Provide valid analysis inputs.",
        );
      throw error;
    }
  });
}
