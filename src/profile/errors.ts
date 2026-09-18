export class ProfileError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}
export const notFound = () => new ProfileError('NOT_FOUND', 404, 'This profile is unavailable.');
export const conflict = () =>
  new ProfileError(
    'STALE_VERSION',
    409,
    'This profile changed. Reload the saved version before editing again.',
  );
