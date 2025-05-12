import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost']
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co; worker-src 'self' blob:;"
          }
        ]
      }
    ];
  },
  webpack: (config) => {
    // This is needed for loading PDF files with react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    return config;
  }
};

export default nextConfig;
