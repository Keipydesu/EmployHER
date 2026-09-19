import { demoProfileHandlers } from "@/profile/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return demoProfileHandlers.suggestions(request, (await context.params).id);
}
