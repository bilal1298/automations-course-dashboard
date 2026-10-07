import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vercel restores .next/cache between deploys; a stale Turbopack cache once shipped old CSS with new code.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    // Browsers must always fetch the latest service worker so updates roll out.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
