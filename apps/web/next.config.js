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
  webpack: (config, { isServer }) => {
    // Only run on the client bundle.
    if (!isServer) {
      const CopyPlugin = require("copy-webpack-plugin");

      // Copy the pdf.js worker into public/ so Next.js serves it
      // as a plain static file — completely bypassing Terser.
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: require.resolve(
                "pdfjs-dist/build/pdf.worker.min.mjs"
              ),
              to: "../../public/pdf.worker.min.mjs",
            },
          ],
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
