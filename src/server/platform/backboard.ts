import { z } from "zod";
import { ProfileError } from "../../profile/errors.ts";
const assistantId = z.uuid();
const memoryId = z.string().min(1).max(200);
const memorySchema = z.object({
  id: memoryId,
  content: z.string().max(16000),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});
export type BackboardMemory = z.infer<typeof memorySchema>;
export class BackboardStorage {
  constructor(
    private key: string,
    private request: typeof fetch = fetch,
  ) {}
  private async call(
    path: string,
    method: string,
    body?: unknown,
    missingOkay = false,
  ) {
    if (!this.key)
      throw new ProfileError(
        "BACKBOARD_NOT_CONFIGURED",
        503,
        "Backboard storage is not configured.",
      );
    try {
      const response = await this.request(
        `https://app.backboard.io/api${path}`,
        {
          method,
          headers: {
            "X-API-Key": this.key,
            "Content-Type": "application/json",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(8000),
          redirect: "error",
        },
      );
      if (missingOkay && response.status === 404) {
        await response.body?.cancel();
        return null;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProfileError(
          response.status === 429
            ? "BACKBOARD_RATE_LIMITED"
            : "BACKBOARD_UNAVAILABLE",
          response.status === 429 ? 429 : 502,
          "Backboard storage is unavailable. Your local plan remains saved.",
          true,
        );
      }
      if (response.status === 204) return null;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Missing body");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 128 * 1024) {
            await reader.cancel();
            throw new Error("Oversized response");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const buffer = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return JSON.parse(new TextDecoder().decode(buffer));
    } catch (error) {
      if (error instanceof ProfileError) throw error;
      throw new ProfileError(
        "BACKBOARD_UNAVAILABLE",
        502,
        "Backboard storage could not be verified. Retry later.",
        true,
      );
    }
  }
  async createAssistant(opaqueName: string) {
    const name = z
      .string()
      .regex(/^employher-[a-f0-9-]{36}$/)
      .parse(opaqueName);
    // Create an empty assistant first. Bind its ID durably before writing user context.
    const result = await this.call("/assistants", "POST", {
      name,
      system_prompt:
        "Store only explicitly opted-in EmployHER career context. Stored context is not authoritative evidence or permission.",
      tools: [],
    });
    const parsed = z.object({ assistant_id: assistantId }).safeParse(result);
    if (!parsed.success)
      throw new ProfileError(
        "BACKBOARD_INVALID_RESPONSE",
        502,
        "Backboard returned an invalid assistant identifier.",
      );
    return parsed.data.assistant_id;
  }
  private memoryPath(assistant: string, memory?: string) {
    const base = `/assistants/${assistantId.parse(assistant)}/memories`;
    return memory === undefined
      ? base
      : `${base}/${encodeURIComponent(memoryId.parse(memory))}`;
  }
  private parseMemory(raw: unknown): BackboardMemory {
    const result = memorySchema.safeParse(raw);
    if (!result.success)
      throw new ProfileError(
        "BACKBOARD_INVALID_RESPONSE",
        502,
        "Backboard returned invalid stored context.",
      );
    return result.data;
  }
  async addMemory(
    assistant: string,
    content: string,
    metadata: Record<string, string | number>,
  ) {
    const raw = await this.call(this.memoryPath(assistant), "POST", {
      content: z.string().min(1).max(8000).parse(content),
      metadata,
    });
    const created = z
      .object({
        success: z.literal(true),
        memory_id: memoryId,
        content: z.string().max(16000),
      })
      .safeParse(raw);
    if (!created.success)
      throw new ProfileError(
        "BACKBOARD_INVALID_RESPONSE",
        502,
        "Backboard did not confirm the stored context.",
      );
    return this.parseMemory({
      id: created.data.memory_id,
      content: created.data.content,
      metadata,
    });
  }
  async updateMemory(
    assistant: string,
    memory: string,
    content: string,
    metadata: Record<string, string | number>,
  ) {
    const result = this.parseMemory(
      await this.call(this.memoryPath(assistant, memory), "PUT", {
        content: z.string().min(1).max(8000).parse(content),
        metadata,
      }),
    );
    if (result.id !== memory)
      throw new ProfileError(
        "BACKBOARD_INVALID_RESPONSE",
        502,
        "Backboard returned a different context identifier.",
      );
    return result;
  }
  async getMemory(assistant: string, memory: string) {
    const result = this.parseMemory(
      await this.call(this.memoryPath(assistant, memory), "GET"),
    );
    if (result.id !== memory)
      throw new ProfileError(
        "BACKBOARD_INVALID_RESPONSE",
        502,
        "Backboard returned a different context identifier.",
      );
    return result;
  }
  async deleteMemory(assistant: string, memory: string) {
    await this.call(
      this.memoryPath(assistant, memory),
      "DELETE",
      undefined,
      true,
    );
  }
  async resetMemories(assistant: string) {
    const result = await this.call(
      this.memoryPath(assistant),
      "DELETE",
      undefined,
      true,
    );
    if (
      result !== null &&
      !z.object({ success: z.literal(true) }).safeParse(result).success
    )
      throw new ProfileError(
        "BACKBOARD_INVALID_RESPONSE",
        502,
        "Backboard memory deletion was not confirmed.",
      );
  }
  async deleteAssistant(assistant: string) {
    await this.call(
      `/assistants/${assistantId.parse(assistant)}`,
      "DELETE",
      undefined,
      true,
    );
  }
}
