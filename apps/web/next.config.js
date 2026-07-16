/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@matchflow/ui", "@matchflow/types", "@matchflow/concourse-graph", "@matchflow/flow-engine"]
};

module.exports = nextConfig;
