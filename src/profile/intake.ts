import { Worker } from "node:worker_threads";
import path from "node:path";
import { LIMITS } from "./contracts";
import { ProfileError } from "./errors";

export async function parsePdf(bytes: Uint8Array): Promise<string> {
  if (bytes.length > LIMITS.bytes)
    throw new ProfileError(
      "FILE_TOO_LARGE",
      413,
      "PDFs must be 2 MB or smaller.",
    );
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new ProfileError(
      "UNSUPPORTED_FILE",
      415,
      "Choose a text-based PDF or paste text instead.",
    );
  return new Promise((resolve, reject) => {
    // Keep this native Node worker out of Next/Turbopack's web-worker transform.
    const worker = Reflect.construct(Worker, [
      path.join(process.cwd(), "src/profile/adapters/pdf-worker.mjs"),
      {
        workerData: bytes,
        resourceLimits: { maxOldGenerationSizeMb: 128 },
      },
    ]) as Worker;
    let settled = false;
    const finish = (error?: ProfileError, text?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else resolve(text!);
    };
    const timer = setTimeout(
      () =>
        finish(
          new ProfileError(
            "PDF_TIMEOUT",
            422,
            "This PDF took too long to read. Paste text instead.",
          ),
        ),
      10_000,
    );
    worker.on("message", (result: { text?: string; error?: string }) => {
      if (result.error)
        return finish(
          new ProfileError(
            "UNREADABLE_PDF",
            422,
            result.error === "PASSWORD"
              ? "Password-protected PDFs are not supported. Paste text instead."
              : result.error === "PAGES"
                ? "Use a PDF with at most five pages."
                : result.error === "TEXT"
                  ? "Use at most 20,000 text characters."
                  : "This PDF could not be read. Paste text instead.",
          ),
        );
      if (!result.text || result.text.trim().length < 20)
        return finish(
          new ProfileError(
            "SCANNED_PDF",
            422,
            "No readable text found. Scanned PDFs need text pasted instead.",
          ),
        );
      finish(undefined, result.text);
    });
    worker.on("error", () => {
      finish(
        new ProfileError(
          "UNREADABLE_PDF",
          422,
          "This PDF could not be read. Paste text instead.",
        ),
      );
    });
    worker.on("exit", () => {
      if (!settled)
        finish(
          new ProfileError(
            "UNREADABLE_PDF",
            422,
            "This PDF could not be read. Paste text instead.",
          ),
        );
    });
  });
}
export async function readBoundedBody(
  request: Request,
  maxBytes = LIMITS.bytes + 65536,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new ProfileError("FILE_TOO_LARGE", 413, "The request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ProfileError("EMPTY_INPUT", 400, "Add a résumé.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ProfileError(
          "FILE_TOO_LARGE",
          413,
          "The request is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function readResumeInput(request: Request): Promise<string> {
  const type = request.headers.get("content-type") ?? "";
  const body = await readBoundedBody(request);
  if (type.startsWith("application/json")) {
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(body));
    } catch {
      throw new ProfileError("INVALID_JSON", 400, "Invalid JSON request.");
    }
    const { z } = await import("zod");
    const parsed = z
      .strictObject({ text: z.string().max(LIMITS.characters) })
      .safeParse(input);
    if (!parsed.success)
      throw new ProfileError(
        "INVALID_INPUT",
        400,
        "Provide résumé text only, up to 20,000 characters.",
      );
    return parsed.data.text;
  }
  if (type.startsWith("multipart/form-data")) {
    let form: FormData;
    try {
      form = await new Response(Buffer.from(body), {
        headers: { "content-type": type },
      }).formData();
    } catch {
      throw new ProfileError(
        "INVALID_FORM",
        400,
        "The upload could not be read.",
      );
    }
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      form.getAll("file").length !== 1 ||
      [...form.keys()].some((k) => k !== "file")
    )
      throw new ProfileError("INVALID_FORM", 400, "Upload exactly one PDF.");
    if (file.type !== "application/pdf")
      throw new ProfileError(
        "UNSUPPORTED_FILE",
        415,
        "Only text-based PDFs are supported.",
      );
    return parsePdf(new Uint8Array(await file.arrayBuffer()));
  }
  throw new ProfileError(
    "UNSUPPORTED_FILE",
    415,
    "Use JSON text or a multipart PDF upload.",
  );
}
