import { z } from "zod";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { checkOrigin, respond } from "@/profile/http";
import { ProfileError } from "@/profile/errors";
import { readBoundedBody } from "@/profile/intake";
import { OpportunityError } from "@/opportunities/engine";
export const runtime = "nodejs";
function safe(work: () => Promise<unknown>) {
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
          "Choose one or more valid fields.",
        );
      throw error;
    }
  });
}
export function GET() {
  return safe(async () => {
    const platform = getPlatformServices();
    return platform.interests.read(await platform.authorize());
  });
}
export function PUT(request: Request) {
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
    const input = JSON.parse(
      new TextDecoder().decode(await readBoundedBody(request, 2048)),
    );
    return platform.interests.update(owner, input, key);
  });
}
