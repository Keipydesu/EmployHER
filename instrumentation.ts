export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installRealProfileRuntimeIfConfigured } =
    await import("./src/server/profile-runtime");
  installRealProfileRuntimeIfConfigured();
}
