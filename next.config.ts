import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';
import packageJson from './package.json';

function resolveAppVersion() {
  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return packageJson.version;
  }
}

const nextConfig: NextConfig = {
  // 使用 Turbopack（Next.js 16 默认）
  turbopack: {},
  env: {
    APP_VERSION: resolveAppVersion(),
  },
};

export default nextConfig;
