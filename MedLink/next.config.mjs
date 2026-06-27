/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["ik.imagekit.io"], // allow ImageKit domain
  },
};

export default nextConfig;
