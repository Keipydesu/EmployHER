import { readFile } from "node:fs/promises";
import { headers } from "next/headers";
import { z } from "zod";
import { sampleProfile, type DemoProfile } from "./demo-data";

const text = z.string().min(1).max(1600);
const profileSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,60}$/),
    name: text,
    initials: z.string().min(1).max(4),
    local: z.literal(true),
    degree: text,
    school: text,
    graduation: text,
    summary: text,
    skills: z.array(text).min(1).max(30),
    projects: z
      .array(z.object({ title: text, description: text }).strict())
      .min(3)
      .max(8),
    evidence: z
      .array(z.object({ title: text, detail: text, tag: text }).strict())
      .length(3),
    researchBullet: text,
    softwareBullet: text,
  })
  .strict();

export async function loadDemoProfile(): Promise<DemoProfile> {
  const filename = process.env.EMPLOYHER_DEMO_PROFILE;
  if (!filename) return sampleProfile;
  // An operator-supplied preview file is never the public fixture. Do not enable
  // it on hosted runtimes; requests must also use a loopback host.
  const host = (await headers()).get("host") ?? "";
  if (
    process.env.VERCEL ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  ) {
    return sampleProfile;
  }
  const raw = await readFile(filename, "utf8");
  if (raw.length > 30000)
    throw new Error("Local demo profile exceeds the preview size limit.");
  const parsed = profileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error(
      "Local demo profile does not match the documented preview schema.",
    );
  return parsed.data;
}
