import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
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
