import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'pg'],
  outputFileTracingIncludes: {
    '/api/resumes': [
      './src/profile/adapters/pdf-worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/*.mjs',
    ],
  },
};
export default config;
