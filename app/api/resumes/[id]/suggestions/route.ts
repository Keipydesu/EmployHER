import { profileHandlers } from "@/profile/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return profileHandlers.suggestions(request, (await context.params).id);
}
