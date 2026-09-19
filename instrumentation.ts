export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializePlatform } =
      await import("./src/server/platform/bootstrap");
    initializePlatform();
  }
}
