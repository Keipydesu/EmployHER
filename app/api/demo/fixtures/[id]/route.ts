import { demoEnabled } from "@/profile/runtime";
import { resumeFixtures } from "@/profile/fixtures";
import { syntheticPdf } from "@/profile/demo-pdf";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!demoEnabled()) return new Response(null, { status: 404 });
  const id = (await context.params).id;
  const fixture = resumeFixtures.find((f) => f.id === id);
  if (!fixture) return new Response(null, { status: 404 });
  return new Response(Buffer.from(syntheticPdf(fixture.text)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="synthetic-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
