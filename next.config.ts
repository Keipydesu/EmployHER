import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["pdfjs-dist", "pg"],
  outputFileTracingIncludes: {
    "/api/resumes": [
      "./src/profile/adapters/pdf-worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/*.mjs",
    ],
  },
};

export default nextConfig;
