/**
 * Per-(modelo, série, ambiente) fiscal number reservation.
 *
 * NF-e/NFC-e numbers (nNF) must be sequential and unique within a série. Each
 * combination of model (55/65), série and ambiente (homologação/produção) has
 * its own independent counter document in `fiscal_counters`, incremented inside
 * a Firestore transaction so concurrent emissions never collide.
 *
 * Mirrors the `pedidoCounters/counter` atomic-increment pattern in
 * `src/lib/pedidos.ts`, but uses the Admin SDK (server-only, transactional).
 */
import { adminDb } from '@/lib/firebase-admin';
import type { FiscalAmbiente, FiscalModelo } from '@/lib/fiscal/types';

const COUNTER_COLLECTION = 'fiscal_counters';

/** Deterministic counter document id for a (modelo, série, ambiente) triple. */
export function nfCounterDocId(
  modelo: FiscalModelo,
  serie: number,
  ambiente: FiscalAmbiente,
): string {
  return `${modelo}-serie-${serie}-${ambiente}`;
}

/**
 * Atomically reserve and return the next número for the given série. The
 * returned number is committed before the caller emits, so a failed emission
 * simply leaves a gap (resolved later via inutilização) rather than reusing it.
 */
export async function reserveNfNumero(
  modelo: FiscalModelo,
  serie: number,
  ambiente: FiscalAmbiente,
): Promise<number> {
  const ref = adminDb
    .collection(COUNTER_COLLECTION)
    .doc(nfCounterDocId(modelo, serie, ambiente));

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const lastNumber =
      snap.exists && typeof snap.data()?.lastNumber === 'number'
        ? (snap.data()!.lastNumber as number)
        : 0;
    const nextNumber = lastNumber + 1;
    if (snap.exists) {
      tx.update(ref, { lastNumber: nextNumber });
    } else {
      tx.set(ref, { lastNumber: nextNumber });
    }
    return nextNumber;
  });
}
