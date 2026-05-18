import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP is easy to mis-tune with Next.js dev tooling (Fast Refresh, webpack style paths).
 * A blocked stylesheet or chunk surfaces as “everything unstyled” / broken UI in the browser.
 * We omit CSP in development; production keeps a practical policy.
 */
const csp = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  /** blob: covers some dev/prod style injection paths; unsafe-inline keeps App Router + Tailwind predictable */
  "style-src 'self' 'unsafe-inline' blob:",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeadersBase = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  /** Avoid wrong monorepo/root detection when another package-lock exists higher in the tree (e.g. user home). */
  outputFileTracingRoot: projectRoot,
  poweredByHeader: false,
  experimental: {
    middlewareClientMaxBodySize: "20mb",
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      /** Onboarding + training decks (pptx/pdf). */
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    const headers = [...securityHeadersBase];
    if (!isDev) {
      headers.push({ key: "Content-Security-Policy", value: csp });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
