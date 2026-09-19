const profileErrorBrand = Symbol.for("employher.ProfileError");
export class ProfileError extends Error {
  readonly [profileErrorBrand] = true;
  // Next instrumentation and route bundles may load separate class copies.
  static [Symbol.hasInstance](value: unknown) {
    return (
      !!value &&
      typeof value === "object" &&
      Symbol.for("employher.ProfileError") in value &&
      Reflect.get(value, Symbol.for("employher.ProfileError")) === true
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
