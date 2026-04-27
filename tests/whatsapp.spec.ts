import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: WhatsApp Inbox UI
 *
 * Structural tests only — they verify rendering, navigation, and the presence of
 * stable data-testid hooks. Real Baileys roundtrip (QR scan, message delivery) is
 * impossible in CI, so no live-network assertions are made.
 *
 * RUN:
 *   1. Start the dev server on port 4000:  npm run dev
 *   2. In another terminal:               npx playwright test tests/whatsapp.spec.ts
 *
 * The default playwright.config.ts uses baseURL=http://localhost:3000 unless
 * TEST_BASE_URL is set; this spec hardcodes the admin port (4000) for the same
 * reason every other spec in tests/ does.
 *
 * TODO (out of scope for MVP): seeded test users for the producao / atendente roles
 * to verify that they are gated out of /whatsapp by middleware + sidebar.
 */

const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

const AUTH_SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('load');

  await page.fill(AUTH_SELECTORS.email, ADMIN_EMAIL);
  await page.fill(AUTH_SELECTORS.password, ADMIN_PASSWORD);
  await page.click(AUTH_SELECTORS.submitButton);

  // CLAUDE.md note: use 'load', NOT 'networkidle' (the latter times out).
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState('load');
}

test.describe('WhatsApp Inbox - structural rendering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('inbox page renders the conversation list region', async ({ page }) => {
    await page.goto(`${BASE_URL}/whatsapp`);
    await page.waitForLoadState('load');

    // The list is keyed off the hook's loading state. Either we see the loading
    // skeleton, the empty-state, or at least one conversation row — but never an error.
    const loading = page.getByTestId('conversation-list-loading');
    const anyRow = page.locator('[data-testid^="conversation-row-"]');
    const emptyState = page.getByText('Nenhuma conversa por aqui ainda.');

    // Wait until loading clears.
    await expect(loading).toHaveCount(0, { timeout: 10_000 });

    const rowCount = await anyRow.count();
    if (rowCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(anyRow.first()).toBeVisible();
    }

    // Status badge is always rendered in the inbox header.
    await expect(page.getByTestId('whatsapp-status-badge')).toBeVisible();
  });

  test('settings page renders status badge and a state card', async ({ page }) => {
    await page.goto(`${BASE_URL}/whatsapp/settings`);
    await page.waitForLoadState('load');

    // Header status badge is always present.
    await expect(page.getByTestId('whatsapp-status-badge')).toBeVisible();

    // The page renders one of the state-specific cards (pairing/connecting/connected/disconnected)
    // OR a loading card OR an error card. We don't know which without live data — assert that
    // at least one of those text fragments is reachable, which proves the structure rendered.
    const possibleCopy = [
      'Carregando status…',
      'Erro ao ler status:',
      'Escaneie com seu WhatsApp Business',
      'Conectando ao WhatsApp…',
      'Conectado',
      'Desconectado',
    ];
    let found = false;
    for (const copy of possibleCopy) {
      if (await page.getByText(copy).first().isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found, `expected one of ${possibleCopy.join(' | ')} on /whatsapp/settings`).toBe(true);

    // Heading should be present.
    await expect(page.getByRole('heading', { name: 'WhatsApp', level: 1 })).toBeVisible();
  });

  test('sidebar exposes the WhatsApp nav entry for admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('load');

    // The sidebar item is the parent group (text 'WhatsApp'). Its submenu links are
    // 'Conversas' and 'Configuração'. Either presence is sufficient proof the gating
    // by `feature: 'whatsapp'` allowed this user through.
    const sidebarLabel = page.getByRole('button', { name: /WhatsApp/i }).first();
    const sidebarLink = page.locator('a[href="/whatsapp"]').first();

    const hasButton = await sidebarLabel.isVisible().catch(() => false);
    const hasLink = await sidebarLink.isVisible().catch(() => false);

    expect(
      hasButton || hasLink,
      'expected the WhatsApp sidebar entry to be visible for admin'
    ).toBe(true);
  });

  test('admin can navigate from /whatsapp to /whatsapp/settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/whatsapp`);
    await page.waitForLoadState('load');

    await page.goto(`${BASE_URL}/whatsapp/settings`);
    await page.waitForLoadState('load');

    expect(page.url()).toMatch(/\/whatsapp\/settings\/?$/);
    await expect(page.getByRole('heading', { name: 'WhatsApp', level: 1 })).toBeVisible();
  });
});
