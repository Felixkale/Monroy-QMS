/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // esmExternals: "loose" is required for pdfjs-dist.
    // Remove if you stop using pdfjs-dist in the future.
    esmExternals: "loose",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config) => {
    // Treat the PDF.js worker as a static file asset so Terser never
    // tries to minify it (it uses ES module syntax that Terser rejects
    // when processed as a plain script).
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: "asset/resource",
      generator: {
        filename: "static/worker/[hash][ext][query]",
      },
    });
    return config;
  },
};

module.exports = nextConfig;
