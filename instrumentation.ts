export async function register() {
  // Keep the import inside the positive runtime branch so the Edge compiler
  // can omit Node-only database modules from its instrumentation bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installRealProfileRuntimeIfConfigured } =
      await import("./src/server/profile-runtime");
    installRealProfileRuntimeIfConfigured();
  }
}
