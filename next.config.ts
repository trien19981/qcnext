import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

/** Cố định root dự án Next (thư mục chứa next.config) để Turbopack không nhầm workspace cha khi có nhiều lockfile. */
const projectRoot = dirname(fileURLToPath(import.meta.url));

const apiUpstream = process.env.API_UPSTREAM_URL ?? "http://127.0.0.1:8002";

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUpstream.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
