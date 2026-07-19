const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@matchflow/ui',
    '@matchflow/types',
    '@matchflow/concourse-graph',
    '@matchflow/flow-engine',
  ],
  webpack: (config) => {
    const pkgs = path.resolve(__dirname, '../../packages');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@matchflow/ui': path.join(pkgs, 'ui/src'),
      '@matchflow/types': path.join(pkgs, 'types/src'),
      '@matchflow/concourse-graph': path.join(pkgs, 'concourse-graph/src'),
      '@matchflow/flow-engine': path.join(pkgs, 'flow-engine/src'),
    };
    return config;
  },
};

module.exports = nextConfig;
