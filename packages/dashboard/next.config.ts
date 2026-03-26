import { resolve } from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@scemas/db', '@scemas/types'],
  devIndicators: false,
  turbopack: {
    root: resolve(import.meta.dirname, '../..'),
  },
}

export default nextConfig
