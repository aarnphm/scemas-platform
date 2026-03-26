import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const nextConfig: NextConfig = {
  transpilePackages: ['@scemas/db', '@scemas/types'],
  devIndicators: false,
  turbopack: { root: resolve(import.meta.dirname, '../..') },
}

export default nextConfig
