import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { CommandSchema } from "../../../../src/opportunities/contracts";
import { OpportunityError } from "../../../../src/opportunities/engine";
import { present } from "../../../../src/opportunities/state";
import { demoStore } from "../../../../src/server/demo-store";
import { validateLocalOrigin } from "../../../../src/server/origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = "employher-demo";
function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function token(request: NextRequest) {
  const value = request.cookies.get(cookie)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function errorResponse(error: unknown) {
  const known = error instanceof OpportunityError;
  return response(
    {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known
          ? error.message
          : "Unable to load the demo. Please retry.",
        retryable: !known,
        requestId: randomUUID(),
      },
    },
    known ? error.status : 500,
  );
}
function localOnly(request: NextRequest) {
  validateLocalOrigin(request.headers.get("host"), request.nextUrl.protocol);
}
function sameOrigin(request: NextRequest) {
  validateLocalOrigin(
    request.headers.get("host"),
    request.nextUrl.protocol,
    request.headers.get("origin"),
  );
}
export async function GET(request: NextRequest) {
  try {
    localOnly(request);
    const existing = token(request);
    const saved = existing ? demoStore.read(existing) : null;
    if (saved) return response(present(saved.state));
    const created = demoStore.create();
    const result = response(present(created.state));
    result.cookies.set(cookie, created.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 30 * 86400,
    });
    return result;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const owner = token(request);
    if (!owner)
      throw new OpportunityError(
        "SESSION_REQUIRED",
        "Reload to start a demo session.",
        401,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new OpportunityError(
        "INVALID_CONTENT_TYPE",
        "JSON input required.",
        415,
      );
    const reader = request.body?.getReader();
    if (!reader)
      throw new OpportunityError(
        "INVALID_INPUT",
        "Request body required.",
        400,
      );
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new OpportunityError(
          "BODY_TOO_LARGE",
          "Demo request is too large.",
          413,
        );
      }
      chunks.push(value);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new OpportunityError("INVALID_INPUT", "Invalid JSON.", 400);
    }
    const parsed = CommandSchema.safeParse(raw);
    if (!parsed.success)
      throw new OpportunityError("INVALID_INPUT", "Invalid demo command.", 400);
    const updated = demoStore.update(
      owner,
      parsed.data,
      request.headers.get("idempotency-key") ?? "",
    );
    return response({
      ...present(updated.state),
      replayed: updated.replayed,
      operationVersion: updated.operationVersion,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    sameOrigin(request);
    const owner = token(request);
    if (owner) demoStore.delete(owner);
    const result = response({ deleted: true });
    result.cookies.delete(cookie);
    return result;
  } catch (error) {
    return errorResponse(error);
  }
}
