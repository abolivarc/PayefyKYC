import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  // future flags here
}

export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set SENTRY_ORG + SENTRY_PROJECT env vars in CI/Vercel)
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Upload source maps only when building for production
  sourcemaps: {
    disable: process.env.NODE_ENV !== "production",
  },
  disableLogger: true,
  automaticVercelMonitors: false,
})
