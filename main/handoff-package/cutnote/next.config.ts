import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext checks multipart requests before dispatching route handlers.
  // Allow a 25 MB video plus thumbnail and form fields; the API validates files.
  experimental: { serverActions: { bodySizeLimit: "27mb" } },
};

export default nextConfig;
