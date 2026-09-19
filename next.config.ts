import type { NextConfig } from "next";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5016/api/v1/";

let apiOrigin = "";
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  apiOrigin = "";
}

const vdocipherOrigins = [
  "https://player.vdocipher.com",
  "https://*.vdocipher.com",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "connect-src 'self'",
    apiOrigin,
    ...vdocipherOrigins,
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://region1.google-analytics.com",
  ]
    .filter(Boolean)
    .join(" "),
  ["frame-src 'self'", ...vdocipherOrigins].join(" "),
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://player.vdocipher.com",
    "https://www.googletagmanager.com",
  ].join(" "),
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  ["media-src 'self' blob:", ...vdocipherOrigins].join(" "),
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,

    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
