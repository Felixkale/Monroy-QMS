/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
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
    // 1. Emit the worker as a plain static file (no bundling).
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: "asset/resource",
      generator: {
        filename: "static/worker/[hash][ext][query]",
      },
    });

    // 2. Tell every Terser instance to skip any file whose output path
    //    contains "pdf.worker" or lands in "static/worker/".
    //    Without this, Terser re-processes the copied asset and chokes
    //    on the ES-module import/export syntax inside it.
    for (const minimizer of config.optimization?.minimizer ?? []) {
      if (minimizer.constructor?.name === "TerserPlugin") {
        minimizer.options.exclude = /pdf\.worker/i;
      }
    }

    return config;
  },
};

module.exports = nextConfig;
