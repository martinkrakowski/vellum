import type { NextConfig } from "next";

// @vellum/* workspace packages are consumed from TypeScript source
// (exports point at src/index.ts — the JIT pattern), so Next must
// transpile them. Keep this list in sync with packages/*.
const nextConfig: NextConfig = {
  transpilePackages: [
    "@vellum/asset-loader",
    "@vellum/audit-governance",
    "@vellum/camera-control",
    "@vellum/correction-delta",
    "@vellum/distortion-detection",
    "@vellum/feedback-domain",
    "@vellum/pipeline-simulation",
    "@vellum/review-dashboard",
    "@vellum/review-lifecycle",
    "@vellum/scene-export",
    "@vellum/scene-orchestration",
    "@vellum/scene-port",
    "@vellum/scene-renderer",
    "@vellum/scene-types",
    "@vellum/shared",
    "@vellum/split-view",
    "@vellum/texture-generation",
    "@vellum/ui",
  ],
  // Package sources use ESM-style ".js" specifiers that resolve to ".ts"
  // files (NodeNext convention, emitted by hexagen). Vitest/Vite resolve
  // this natively; webpack needs the alias spelled out.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
