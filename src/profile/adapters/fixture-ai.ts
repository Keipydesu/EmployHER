import { createHash } from "node:crypto";
import { resumeFixtures } from "../fixtures";
import { prepareText } from "../evidence";
import type { ProfileAI } from "../ports";
import type { Embedding } from "../contracts";
import { ProfileError } from "../errors";
export class FixtureProfileAI implements ProfileAI {
  readonly model = "synthetic-fixture-adapter";
  async extract(text: string) {
    const fixture = resumeFixtures.find(
      (f) =>
        prepareText(f.text).replace(/\s+/g, " ").replace(/-/g, "—") ===
        text.replace(/\s+/g, " ").replace(/-/g, "—"),
    );
    if (!fixture)
      throw new ProfileError(
        "FIXTURE_ONLY",
        403,
        "The local demo accepts the provided synthetic résumés only.",
      );
    // PDF whitespace may differ: locate matching exact excerpts in the actual input.
    const facts = fixture.facts.map((f) => ({
      ...f,
      excerpt: text.includes(f.excerpt)
        ? f.excerpt
        : f.excerpt.replace(/\s+/g, " "),
    }));
    return { facts };
  }
  async embed(summary: string): Promise<Embedding> {
    const hash = createHash("sha256").update(summary).digest();
    return {
      values: Array.from(
        { length: 768 },
        (_, i) => (hash[i % hash.length] + 1) / 256,
      ),
      model: "synthetic-vector-not-for-matching",
      dimensions: 768,
      config: "profile-semantic-v1",
      simulated: true,
    };
  }
}
