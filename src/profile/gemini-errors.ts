import { ProfileError } from "./errors.ts";

// Only HTTP status is translated. Never expose upstream bodies or credentials.
export function geminiHttpError(status: number) {
  if (status === 400)
    return new ProfileError(
      "AI_REQUEST_REJECTED",
      502,
      "Gemini rejected the request configuration. The application configuration needs review.",
    );
  if (status === 404)
    return new ProfileError(
      "AI_MODEL_UNAVAILABLE",
      503,
      "The configured Gemini model is not available for this request. Check the model configuration.",
    );
  if (status === 401 || status === 403)
    return new ProfileError(
      "AI_ACCESS_DENIED",
      503,
      "Gemini access was denied. Check the application's API configuration.",
    );
  if (status === 429)
    return new ProfileError(
      "AI_RATE_LIMITED",
      429,
      "Gemini's request limit was reached. Try again later.",
      true,
    );
  return new ProfileError(
    "AI_UNAVAILABLE",
    status === 503 ? 503 : 502,
    "Gemini is temporarily unavailable. Please retry later.",
    status === 408 || status >= 500,
  );
}
