import { demoProfileHandlers } from "@/profile/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return demoProfileHandlers.get(request, (await context.params).id);
}
export async function PATCH(request: Request, context: Context) {
  return demoProfileHandlers.patch(request, (await context.params).id);
}
