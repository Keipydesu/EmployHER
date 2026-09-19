import { z } from "zod";
import { getPlatformServices } from "@/server/platform/bootstrap";
import { respond } from "@/profile/http";
import { ProfileError } from "@/profile/errors";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return respond(async () => {
    const platform = getPlatformServices();
    const owner = await platform.authorize(false, true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success)
      throw new ProfileError("NOT_FOUND", 404, "Deletion request unavailable.");
    return platform.lifecycle.status(owner, id);
  });
}
