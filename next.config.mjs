/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // pdf-parse ships sample data + dynamic require()s that webpack can't
    // bundle cleanly. Treat it as an external server-only package so Node
    // requires it at runtime from node_modules.
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
