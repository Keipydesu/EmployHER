const profileErrorBrand = Symbol.for("employher.profile-error");

export class ProfileError extends Error {
  readonly [profileErrorBrand] = true;

  // The demo session and route can hold separate Next.js module instances.
  // Preserve known, safe errors when they cross that server bundle boundary.
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as ProfileError)[profileErrorBrand] === true
    );
  }

  constructor(
    public code: string,
    public status: number,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}
export const notFound = () =>
  new ProfileError("NOT_FOUND", 404, "This profile is unavailable.");
export const conflict = () =>
  new ProfileError(
    "STALE_VERSION",
    409,
    "This profile changed. Reload the saved version before editing again.",
  );
