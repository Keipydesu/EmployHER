import { z } from "zod";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { checkOrigin, respond } from "@/profile/http";
import { ProfileError } from "@/profile/errors";
import { OpportunityError } from "@/opportunities/engine";
import { readBoundedBody } from "@/profile/intake";
export const runtime = "nodejs";
const inputSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }).strict(),
  z
    .object({
      enabled: z.literal(true),
      profileId: z.uuid(),
      profileVersion: z.number().int().positive(),
    })
    .strict(),
]);
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
          "Provide valid memory preferences.",
        );
      throw error;
    }
  });
}
export function GET() {
  return safe(async () => {
    const platform = getPlatformServices();
    return platform.memory.status(await platform.authorize());
  });
}
export function PUT(request: Request) {
  return safe(async () => {
    checkOrigin(request);
    const platform = getPlatformServices();
    const owner = await platform.authorize(true);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new ProfileError("INVALID_INPUT", 415, "Use JSON.");
    const input = inputSchema.parse(
      JSON.parse(
        new TextDecoder().decode(await readBoundedBody(request, 2048)),
      ),
    );
    if (!input.enabled) return platform.memory.queue(owner, null);
    const view = await platform.career.read(
      owner,
      input.profileId,
      input.profileVersion,
    );
    const content = JSON.stringify({
      field: view.saved.plan.pathId,
      steps: view.saved.plan.actions
        .filter((a) => a.state === "selected")
        .map((a) => ({ title: a.title, deliverable: a.deliverable })),
    });
    return platform.memory.queue(owner, {
      profileId: input.profileId,
      profileVersion: input.profileVersion,
      catalogVersion: view.saved.catalogVersion,
      planVersion: view.saved.version,
      interestVersion: view.interestVersion,
      content,
    });
  });
}
