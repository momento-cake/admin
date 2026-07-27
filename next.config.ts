import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  // The fiscal (NF-e/NFC-e) provider runs server-only and pulls in native/Node
  // packages (pdfkit, XML tooling) that must not be bundled by Next/Turbopack.
  serverExternalPackages: [
    'nfewizard-io',
    '@nfewizard/nfce',
    '@nfewizard/danfe',
    'pdfkit',
  ],
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      // Creating an order is a modal now, not a page. Without this, the
      // /orders/[id] route would swallow "new" as an order id and render
      // "Pedido não encontrado" for anyone holding an old bookmark.
      // destination keeps the trailing slash to match `trailingSlash: true`
      // above, so the browser doesn't take an extra normalising hop.
      { source: '/orders/new', destination: '/orders/', permanent: true },
    ];
  },
};

export default nextConfig;
