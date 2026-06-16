import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// We test the middleware function directly
import { middleware } from '@/middleware';

describe('Subdomain Routing Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pedidos.momentocake.com.br subdomain', () => {
    it('should rewrite /{token} to /pedido/{token}/ with a trailing slash', () => {
      const request = new NextRequest('https://pedidos.momentocake.com.br/abc123token99', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      // NextResponse.rewrite returns a response with the rewritten URL
      // The x-middleware-rewrite header indicates the rewrite destination.
      // The trailing slash is REQUIRED — next.config has `trailingSlash: true`,
      // so the page is registered at /pedido/{token}/ and a slash-less rewrite 404s.
      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      expect(rewriteUrl).not.toBeNull();
      expect(new URL(rewriteUrl!).pathname).toBe('/pedido/abc123token99/');
    });

    it('should rewrite /{token}/ (trailing slash, the form production receives) to /pedido/{token}/', () => {
      // Customers always land here: ShareOrderButton emits a slash-less link,
      // but `trailingSlash: true` 308-redirects the browser to add the slash.
      const request = new NextRequest('https://pedidos.momentocake.com.br/abc123token99/', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      expect(rewriteUrl).not.toBeNull();
      expect(new URL(rewriteUrl!).pathname).toBe('/pedido/abc123token99/');
    });

    it('should allow /pedido/{token} through as-is on subdomain', () => {
      const request = new NextRequest('https://pedidos.momentocake.com.br/pedido/abc123token99', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      // Should pass through (NextResponse.next()) since /pedido/ is a public route
      // No rewrite should happen
      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      // Either no rewrite header or the rewrite points to the same /pedido/ path
      if (rewriteUrl) {
        expect(rewriteUrl).toContain('/pedido/abc123token99');
      } else {
        // next() response - correct behavior
        expect(response.status).toBe(200);
      }
    });

    it('should return 404 for root path on subdomain', () => {
      const request = new NextRequest('https://pedidos.momentocake.com.br/', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-token paths on subdomain', () => {
      const request = new NextRequest('https://pedidos.momentocake.com.br/dashboard/settings', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      expect(response.status).toBe(404);
    });

    it('should serve static assets (e.g. /brand/logo.png) without rewriting or 404ing', () => {
      const request = new NextRequest('https://pedidos.momentocake.com.br/brand/logo.png', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      // Must pass through (NextResponse.next()) — not the multi-segment 404,
      // and not rewritten into /pedido/*.
      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    });

    it('should let Next internals (/_next/*) through on the subdomain', () => {
      const request = new NextRequest(
        'https://pedidos.momentocake.com.br/_next/static/chunks/main.js',
        { headers: { host: 'pedidos.momentocake.com.br' } }
      );

      const response = middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    });
  });

  // Behind Firebase App Hosting the proxy rewrites Host to the internal
  // *.hosted.app backend host and forwards the real domain in x-forwarded-host.
  // The portal rewrite must key off x-forwarded-host or it never fires in prod.
  describe('behind App Hosting proxy (x-forwarded-host)', () => {
    const BACKEND_HOST = 'admin--momentocake-admin.us-east4.hosted.app';

    it('rewrites /{token} to /pedido/{token}/ when x-forwarded-host is the portal domain', () => {
      const request = new NextRequest(`https://${BACKEND_HOST}/abc123token99`, {
        headers: {
          host: BACKEND_HOST,
          'x-forwarded-host': 'pedidos.momentocake.com.br',
        },
      });

      const response = middleware(request);

      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      expect(rewriteUrl).not.toBeNull();
      expect(new URL(rewriteUrl!).pathname).toBe('/pedido/abc123token99/');
    });

    it('handles a port in x-forwarded-host', () => {
      const request = new NextRequest(`https://${BACKEND_HOST}/abc123token99`, {
        headers: {
          host: BACKEND_HOST,
          'x-forwarded-host': 'pedidos.momentocake.com.br:443',
        },
      });

      const response = middleware(request);

      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      expect(rewriteUrl).not.toBeNull();
      expect(new URL(rewriteUrl!).pathname).toBe('/pedido/abc123token99/');
    });

    it('does not apply portal routing for the admin domain via the proxy', () => {
      const request = new NextRequest(`https://${BACKEND_HOST}/dashboard`, {
        headers: {
          host: BACKEND_HOST,
          'x-forwarded-host': 'admin.momentocake.com.br',
        },
      });

      const response = middleware(request);

      // Protected route without auth → redirect to login, never a portal 404.
      expect(response.status).not.toBe(404);
    });
  });

  describe('Regular domain requests', () => {
    it('should pass through regular domain requests unchanged', () => {
      const request = new NextRequest('https://momentocake.com.br/dashboard', {
        headers: { host: 'momentocake.com.br' },
      });

      const response = middleware(request);

      // Regular protected route behavior - should not be a 404
      expect(response.status).not.toBe(404);
    });

    it('should allow /pedido/{token} on main domain', () => {
      const request = new NextRequest('https://momentocake.com.br/pedido/abc123token99', {
        headers: { host: 'momentocake.com.br' },
      });

      const response = middleware(request);

      // /pedido is a public route, should pass through
      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      expect(rewriteUrl).toBeNull();
      expect(response.status).toBe(200);
    });
  });

  describe('Localhost requests', () => {
    it('should pass through localhost requests unchanged', () => {
      const request = new NextRequest('http://localhost:4000/dashboard', {
        headers: { host: 'localhost:4000' },
      });

      const response = middleware(request);

      // Should not apply subdomain logic
      expect(response.status).not.toBe(404);
    });

    it('should allow /pedido/{token} on localhost', () => {
      const request = new NextRequest('http://localhost:4000/pedido/abc123token99', {
        headers: { host: 'localhost:4000' },
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });
  });
});
