import type { NextConfig } from "next";

function getApiOrigin(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return "http://localhost:8001";
  }
}

const apiOrigin = getApiOrigin();
const connectSrc = ["'self'", apiOrigin];

if (apiOrigin.startsWith("http://")) {
  connectSrc.push(apiOrigin.replace("http://", "ws://"));
}

if (apiOrigin.startsWith("https://")) {
  connectSrc.push(apiOrigin.replace("https://", "wss://"));
}

const cspHeader = `
    default-src 'self';
    connect-src ${connectSrc.join(" ")} https://api.razorpay.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://lumberjack.razorpay.com;
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://checkout.razorpay.com https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://apis.google.com https://*.firebaseapp.com;
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.contextly.live" }],
        destination: "https://contextly.live/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }
        ],
      },
    ]
  }
};

export default nextConfig;
