import { z } from "zod";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { checkOrigin, respond } from "@/profile/http";
import { ProfileError } from "@/profile/errors";
import { readBoundedBody } from "@/profile/intake";
import { OpportunityError } from "@/opportunities/engine";
import { CommandSchema } from "@/opportunities/contracts";
export const runtime = "nodejs";
const inputSchema = z
  .object({
    profileId: z.uuid(),
    profileVersion: z.coerce.number().int().positive(),
  })
  .strict();
async function safe(work: () => Promise<unknown>) {
  return respond(async () => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof OpportunityError)
        throw new ProfileError(error.code, error.status, error.message);
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        throw new ProfileError(
          "INVALID_INPUT",
          400,
          "Provide valid career-plan inputs.",
        );
      throw error;
    }
  });
}
export async function GET(request: Request) {
  return safe(async () => {
    const platform = getPlatformServices();
    const owner = await platform.authorize();
    const input = inputSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return platform.career.read(owner, input.profileId, input.profileVersion);
  });
}
export async function POST(request: Request) {
  return safe(async () => {
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
      new TextDecoder().decode(await readBoundedBody(request, 16 * 1024)),
    );
    const input = inputSchema
      .extend({
        catalogVersion: z.string().min(1).max(120),
        command: CommandSchema,
      })
      .strict()
      .parse(body);
    return platform.career.update(
      owner,
      input.profileId,
      input.profileVersion,
      input.catalogVersion,
      input.command,
      key,
    );
  });
}
