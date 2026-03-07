import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// We test the middleware function directly
import { middleware } from '@/middleware';

describe('Subdomain Routing Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pedidos.momentocake.com.br subdomain', () => {
    it('should rewrite /{token} to /pedido/{token}', () => {
      const request = new NextRequest('https://pedidos.momentocake.com.br/abc123token99', {
        headers: { host: 'pedidos.momentocake.com.br' },
      });

      const response = middleware(request);

      // NextResponse.rewrite returns a response with the rewritten URL
      // The x-middleware-rewrite header indicates the rewrite destination
      const rewriteUrl = response.headers.get('x-middleware-rewrite');
      expect(rewriteUrl).toContain('/pedido/abc123token99');
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
