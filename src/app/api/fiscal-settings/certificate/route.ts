import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getFiscalBucket } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCertFile } from '@/lib/validators/fiscal';
import { encryptPii } from '@/lib/billing-encryption';
import {
  getAuthFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// Storage upload + crypto require the Node runtime.
export const runtime = 'nodejs';

const SETTINGS_COLLECTION = 'storeSettings';
const FISCAL_DOC_ID = 'fiscal';

/** Fixed private path — one active certificate at a time. */
const CERT_STORAGE_PATH = 'fiscal/certificates/cert.pfx';

/**
 * POST /api/fiscal-settings/certificate — upload the A1 certificate (.pfx).
 * Admin-only. The bytes go to PRIVATE Cloud Storage via the Admin SDK (no public
 * download URL); only metadata is written to `storeSettings/fiscal`. An optional
 * `password` field is stored encrypted in the same request.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }
    if (auth.role !== 'admin') {
      return forbiddenResponse('Configuração fiscal é exclusiva para administradores');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const password = formData.get('password');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 },
      );
    }

    const validation = validateCertFile(file as File);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await (file as File).arrayBuffer());

    await getFiscalBucket()
      .file(CERT_STORAGE_PATH)
      .save(bytes, {
        contentType: 'application/x-pkcs12',
        resumable: false,
        metadata: { cacheControl: 'no-store' },
      });

    const metadata: Record<string, unknown> = {
      certStoragePath: CERT_STORAGE_PATH,
      certFileName: (file as File).name,
      certUpdatedAt: FieldValue.serverTimestamp(),
      certUpdatedBy: auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    };

    if (typeof password === 'string' && password.length > 0) {
      metadata.certPasswordEnc = encryptPii(password);
    }

    await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(FISCAL_DOC_ID)
      .set(metadata, { merge: true });

    return NextResponse.json({
      success: true,
      data: {
        certFileName: (file as File).name,
        hasCert: true,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao enviar certificado fiscal:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
