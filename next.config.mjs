/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // unpdf bundles its own pdfjs worker; let Node require it directly so
    // webpack doesn't try to inline the worker bundle.
    serverComponentsExternalPackages: ["unpdf"],
  },
};

export default nextConfig;
