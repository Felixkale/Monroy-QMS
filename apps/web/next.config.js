/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      enforce: "pre",
      use: [
        {
          loader: "string-replace-loader",
          options: {
            search: "@import url\\([^)]+\\);?\\s*",
            replace: "",
            flags: "g",
          },
        },
      ],
    });
    return config;
  },
};
module.exports = nextConfig;
