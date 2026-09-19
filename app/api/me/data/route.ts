import { getPlatformServices } from "@/server/platform/bootstrap";
import { checkOrigin, respond } from "@/profile/http";
export const runtime = "nodejs";
export async function GET() {
  return respond(async () => {
    const platform = getPlatformServices();
    return platform.lifecycle.latest(await platform.authorize(false, true));
  });
}
export async function DELETE(request: Request) {
  return respond(async () => {
    checkOrigin(request);
    const platform = getPlatformServices();
    const owner = await platform.authorize(false, true);
    return platform.lifecycle.request(owner);
  }, 202);
}
