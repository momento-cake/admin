import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fiscalSettingsSchema } from '@/lib/validators/fiscal';
import { encryptPii } from '@/lib/billing-encryption';
import {
  getAuthFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// Certificate download + encryption run on Node crypto/Storage APIs.
export const runtime = 'nodejs';

const SETTINGS_COLLECTION = 'storeSettings';
const FISCAL_DOC_ID = 'fiscal';

/**
 * GET /api/fiscal-settings — return the fiscal config for the settings page.
 * Admin-only. Secrets (`certPasswordEnc`, `cscEnc`) are stripped and replaced
 * with presence booleans so the UI can show status without exposing values.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }
    if (auth.role !== 'admin') {
      return forbiddenResponse('Configuração fiscal é exclusiva para administradores');
    }

    const snapshot = await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(FISCAL_DOC_ID)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json({
        success: true,
        data: {
          ambiente: 'homologacao',
          hasCert: false,
          hasCsc: false,
        },
      });
    }

    const raw = (snapshot.data() ?? {}) as Record<string, unknown>;
    // Never leak encrypted secrets to the client — strip them from a shallow copy.
    const safe = { ...raw };
    delete safe.certPasswordEnc;
    delete safe.cscEnc;

    return NextResponse.json({
      success: true,
      data: {
        ...safe,
        hasCert: Boolean(raw.certStoragePath),
        hasCsc: Boolean(raw.cscEnc),
      },
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configuração fiscal:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/fiscal-settings — update fiscal config. Admin-only. Encrypts the CSC
 * token (into `cscEnc`) and certificate password (into `certPasswordEnc`) when
 * provided; otherwise leaves the stored secrets untouched.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }
    if (auth.role !== 'admin') {
      return forbiddenResponse('Configuração fiscal é exclusiva para administradores');
    }

    const body = await request.json();

    const validation = fiscalSettingsSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validação falhou', details: errors },
        { status: 400 },
      );
    }

    const { csc, certPassword, cscId, ...fields } = validation.data;

    const settingsData: Record<string, unknown> = {
      ...fields,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    };

    // CSC id is always persisted (may be cleared to empty); the token is only
    // (re)written when a new one is supplied.
    if (cscId !== undefined) {
      settingsData.cscId = cscId;
    }
    if (csc) {
      settingsData.cscEnc = encryptPii(csc);
    }
    if (certPassword) {
      settingsData.certPasswordEnc = encryptPii(certPassword);
    }

    await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(FISCAL_DOC_ID)
      .set(settingsData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração fiscal:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
