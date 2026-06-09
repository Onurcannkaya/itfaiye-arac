import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: '/yonetim/envanteri',
        destination: '/yonetim/envanter',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
