import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir:
    process.env.NEXT_TEST_OUTPUT === "smoke"
      ? ".next-smoke"
      : process.env.NEXT_TEST_OUTPUT === "auth"
        ? ".next-auth-test"
        : process.env.NEXT_TEST_OUTPUT === "true"
          ? ".next-test"
          : ".next",
  agentRules: false,
  serverExternalPackages: ["pdfjs-dist", "pg"],
  outputFileTracingIncludes: {
    "/api/{resumes,demo/resumes}": [
      "./src/profile/adapters/pdf-worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/*.mjs",
    ],
  },
};

export default nextConfig;
