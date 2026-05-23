import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sdhp/shared'],
  // Required for Docker production build (Dockerfile.web uses standalone output)
  output: 'standalone',
};

export default withNextIntl(nextConfig);
