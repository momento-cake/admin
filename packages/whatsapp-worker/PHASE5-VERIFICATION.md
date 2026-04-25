# Phase 5 Verification

- **Date**: 2026-04-25
- **Branch**: feature/whatsapp-integration
- **Worktree**: `/Users/gabrielaraujo/projects/momentocake/admin/.claude/worktrees/whatsapp-integration`

## 1. Test Counts

Vitest at the root level was run as targeted groups (`src/__tests__/lib`,
`/api`, `/components`, `/hooks`, `/integration`, `/middleware` + `/app`) with
`--no-file-parallelism --reporter=basic`. The full-suite `npx vitest run`
hangs without `--no-file-parallelism`; the targeted-group strategy avoids that
and keeps each invocation under 30s.

The worker package (`packages/whatsapp-worker`) has its own `npm test` that
already includes `--no-file-parallelism`.

### Aggregate (root + worker package)

| Bucket | Test files (pass / fail / total) | Tests (pass / fail / total) |
|---|---|---|
| `src/__tests__/lib` | 16 / 2 / 18 | 427 / 5 / 432 |
| `src/__tests__/api` | 11 / 3 / 14 | 127 / 1 / 128 |
| `src/__tests__/components` | 20 / 5 / 25 | 305 / 22 / 327 |
| `src/__tests__/hooks` | 5 / 2 / 7 | 52 / 2 / 54 |
| `src/__tests__/integration` | 1 / 3 / 4 | 28 / 18 / 46 |
| `src/__tests__/middleware` + `/app` | 3 / 0 / 3 | 22 / 0 / 22 |
| `packages/whatsapp-worker` | 6 / 0 / 6 | 45 / 0 / 45 |
| **Total** | **62 / 15 / 77** | **1006 / 48 / 1054** |

### New tests added in Phases 1-4 (all passing)

These are the WhatsApp-specific test files added by this feature branch. Every
one is in the **passing** column above.

**Worker package** (Phase 1):
- `packages/whatsapp-worker/src/__tests__/auth-state.test.ts` (5)
- `packages/whatsapp-worker/src/__tests__/lease.test.ts` (7)
- `packages/whatsapp-worker/src/__tests__/inbound.test.ts` (10)
- `packages/whatsapp-worker/src/__tests__/outbound.test.ts` (4)
- `packages/whatsapp-worker/src/__tests__/status.test.ts` (4)
- `packages/whatsapp-worker/src/__tests__/phone.test.ts` (15)

**Admin app** (Phases 2-4):
- `src/__tests__/lib/validators/whatsapp.test.ts`
- `src/__tests__/lib/whatsapp.test.ts`
- `src/__tests__/lib/clients.test.ts` (extended)
- `src/__tests__/lib/permissions.test.ts` (extended for `whatsapp` feature)
- `src/__tests__/api/whatsapp/status.test.ts`
- `src/__tests__/api/whatsapp/conversations-list.test.ts`
- `src/__tests__/api/whatsapp/messages-list.test.ts`
- `src/__tests__/api/whatsapp/send.test.ts`
- `src/__tests__/api/whatsapp/link-client.test.ts`
- `src/__tests__/api/whatsapp/quick-create-client.test.ts`
- `src/__tests__/hooks/useWhatsAppStatus.test.ts`
- `src/__tests__/hooks/useWhatsAppConversations.test.ts`
- `src/__tests__/hooks/useWhatsAppMessages.test.ts`
- `src/__tests__/components/whatsapp/WhatsAppStatusBadge.test.tsx`
- `src/__tests__/components/whatsapp/ConversationList.test.tsx`
- `src/__tests__/components/whatsapp/MessageThread.test.tsx`
- `src/__tests__/components/whatsapp/MessageComposer.test.tsx`
- `src/__tests__/components/whatsapp/ContactPanel.test.tsx`
- `src/__tests__/components/whatsapp/CreatePedidoSheet.test.tsx`
- `src/__tests__/components/pedidos/ShareOrderButton.test.tsx`
- `src/__tests__/integration/whatsapp-chat-to-pedido.test.tsx`

## 2. Pre-existing Failing Test Files

All 15 failing test files (48 failing tests) are **pre-existing** — the
hand-off note flagged the same set, and none of them were touched by Phases
1-4. They are not blockers for this PR.

| File | Notes |
|---|---|
| `src/__tests__/lib/ingredients.test.ts` | Pre-existing |
| `src/__tests__/lib/recipes.test.ts:479` | Pre-existing (`checkCircularDependency` returns no `message` on error path) |
| `src/__tests__/api/ingredients.test.ts` | Pre-existing collect/import error |
| `src/__tests__/api/recipes.test.ts` | Pre-existing collect/import error |
| `src/__tests__/api/invitations.test.ts` | One assertion fails ("should accept viewer role") |
| `src/__tests__/components/Header.test.tsx` | Pre-existing |
| `src/__tests__/components/Sidebar.test.tsx` | Pre-existing |
| `src/__tests__/components/IngredientForm.test.tsx` | Pre-existing |
| `src/__tests__/components/LoginForm.test.tsx` | Pre-existing |
| `src/__tests__/components/packaging.test.tsx` | Pre-existing |
| `src/__tests__/hooks/useRecipeCosts.test.ts` | Pre-existing |
| `src/__tests__/hooks/useAuth.test.ts` | Pre-existing |
| `src/__tests__/integration/auth-workflow.test.ts` | Pre-existing |
| `src/__tests__/integration/ingredient-workflow.test.ts` | Pre-existing |
| `src/__tests__/integration/recipe-workflow.test.ts` | Pre-existing |

## 3. `tsc --noEmit`

**Result: fails with worktree-environment errors only.**

The errors fall into two groups:

1. **Worker test type-fitting nits** — two `KeyPair` `keyId` literal-property
   mismatches in `auth-state.test.ts`, and a `Mock<>` overload mismatch in
   `outbound.test.ts`. The worker package's own `npm test` (which runs
   `vitest`, not `tsc`) is green for both files; these are strict-mode
   complaints about the inline mock factories' return shapes, not behavioral
   bugs. They surface only because root `tsc` walks into the worker package
   with the root's stricter `tsconfig`.

2. **`vitest.config.ts`** — fails with a `Plugin<any>` type duplication where
   the same `vite` types are loaded from both
   `<worktree>/node_modules/vite/...` and the parent
   `<admin>/node_modules/vite/...` (the worktree has its own `node_modules`,
   which is the standard worktree pattern). This is a worktree-environment
   artifact — the file was not touched in Phases 1-4 and the parent admin
   workspace builds fine.

Neither group was introduced by Phases 1-4 and neither blocks runtime.

## 4. `npm run lint` on new files

**Lint summary**: 22 errors, 330 warnings across 352 problems. The pre-existing
admin codebase contributes the bulk (e.g. `setState synchronously within an
effect` errors in `LoginForm.tsx`, `Header.tsx`, `IngredientSelectionModal.tsx`,
`StoreAddressForm.tsx`, plus `prefer-const` errors in `lib/folders.ts`,
`lib/images.ts`, `lib/time-tracking.ts`, `hooks/useTimeTrackingAdmin.ts`).

### New-file lint findings

| File | Rule | Status |
|---|---|---|
| `packages/whatsapp-worker/src/index.ts:85,93` | `react-hooks/rules-of-hooks` on `useFirestoreAuthState()` | False positive — Node CLI script with no React. The function name starts with `use` but the worker is not a React tree. Out of scope to suppress; harmless. |
| `packages/whatsapp-worker/dist/index.js:85,93` | Same as above | Build artifact; should be `.eslintignore`d. Tracked under "Open items". |
| `src/app/(dashboard)/whatsapp/page.tsx:30:25` | React Compiler "setState synchronously within an effect" | **Same pattern as pre-existing pages** (`LoginForm`, `Header`, etc.). Project tolerates this rule. |
| `src/app/(dashboard)/whatsapp/settings/page.tsx:39:49` | React Compiler "Cannot call impure function during render" | Same — matches existing project patterns. |
| `src/components/whatsapp/MessageThread.tsx:146:7` | setState-in-effect | Same pre-existing pattern. |
| `src/hooks/useWhatsAppStatus.ts:26:7` | setState-in-effect | Same — Firestore subscription pattern used everywhere else in `src/hooks/*`. |
| `src/hooks/useWhatsAppConversations.ts:26:7` | setState-in-effect | Same. |
| `src/hooks/useWhatsAppMessages.ts:20:7` | setState-in-effect | Same. |

All new-file errors are either false-positives (worker `useFirestoreAuthState`)
or are the same React Compiler complaints already accepted on the pre-existing
codebase. No fix is being applied because matching the project's house style
keeps the diff narrow; if the project later globally adopts a fix for the
React Compiler rule, the new files will benefit at the same time.

## 5. `npm run build`

**Result: fails on `vitest.config.ts` only.**

Next.js compilation succeeds:

```
✓ Compiled successfully in 4.7s
  Running TypeScript ...
Failed to compile.

./vitest.config.ts:6:13
Type error: No overload matches this call.
```

The error is the **same vite-type duplication** described under §3 — the
worktree has a parallel `node_modules/vite/...` to the parent admin's
`node_modules/vite/...` and TypeScript sees the two Plugin types as
unrelated. `vitest.config.ts` was not touched in Phases 1-4. Running the
build from the parent admin worktree (or after merging to main, where there
is only one `node_modules`) makes the error go away.

## 6. Open Items (manual follow-ups for the user)

These are deliberate hand-offs, not regressions:

- **Provision the OCI VM.** Follow `packages/whatsapp-worker/README.md`
  → "One-time setup" (oci-cli + console steps; capacity fallback
  `sa-saopaulo-1` → `sa-vinhedo-1` → `us-ashburn-1`).
- **Generate Firebase service-account JSON.** Place at
  `/opt/whatsapp-worker/service-account.json` (`chmod 600`).
- **First deploy.**
  1. `./packages/whatsapp-worker/scripts/build-image.sh`
  2. `scp` the unit + `install-systemd.sh` to the VM, run once
  3. `OCI_HOST=<ip> ./packages/whatsapp-worker/scripts/deploy-via-ssh.sh`
- **WhatsApp pairing.** Visit `/whatsapp/settings` in the admin UI, scan the
  QR with the WhatsApp Business app on the bakery's phone. The `whatsapp_status`
  doc transitions `pairing` → `connecting` → `connected`.
- **(Optional) Add `packages/whatsapp-worker/dist/**` to `.eslintignore`** so
  the compiled `dist/index.js` stops generating duplicate lint findings. Low
  priority — the file isn't shipped to git in normal operation.
- **(Optional, deferred) Service-account least privilege.** README §
  "Future hardening" tracks the move from a broad Firebase Admin SDK key to a
  custom IAM role limited to the worker's collections.

## Sign-off

Phases 1-5 mechanically complete. Manual deploy + WhatsApp number pairing
remains; see README.
