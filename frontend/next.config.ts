import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.resolve(process.cwd()),
  typedRoutes: true,
};

export default nextConfig;
