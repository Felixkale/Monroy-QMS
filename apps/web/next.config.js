/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Removed: swcMinify: false ──────────────────────────────
  // SWC minifier is on by default and disabling it will not be
  // allowed in Next.js 15. Removing this line silences the warning
  // and gives you faster, smaller builds.

  experimental: {
    // esmExternals: "loose" is kept only because pdfjs-dist needs it.
    // Remove it if you stop using pdfjs-dist in the future.
    esmExternals: "loose",
  },

  typescript: {
    // Keeps build from failing on type errors.
    // Recommended to fix types properly over time and remove this.
    ignoreBuildErrors: true,
  },

  eslint: {
    // Keeps build from failing on lint errors.
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
};

module.exports = nextConfig;
