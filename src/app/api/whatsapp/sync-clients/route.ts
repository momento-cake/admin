import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { normalizePhone } from '@/lib/phone';

const CLIENTS_COLLECTION = 'clients';
const SYNC_JOBS_COLLECTION = 'whatsapp_sync_jobs';

interface ClientContactMethod {
  type?: string;
  value?: string;
}

interface ClientDoc {
  id?: string;
  name?: string;
  phone?: string;
  isActive?: boolean;
  contactMethods?: ClientContactMethod[];
}

/**
 * Admin-only endpoint that fans every active client's phone(s) into a
 * WhatsApp cross-reference job. The worker picks up the job, calls
 * `sock.onWhatsApp(...)` to filter to numbers that actually have WhatsApp,
 * and pre-creates placeholder conversations for the matches.
 *
 * Returns the job ID so the UI can subscribe to the job doc and show
 * progress / aggregate counts when the worker finishes.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    // Admin-only — this is a one-shot bulk operation that touches Firestore
    // for every active client and triggers WhatsApp protocol calls. Atendentes
    // do not need this; only an admin should kick it off.
    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem sincronizar contatos do CRM');
    }

    // Read every active client. The clients collection is small enough
    // (hundreds, not millions) that a full scan is fine and avoids needing
    // a multi-clause Firestore index.
    const snap = await adminDb
      .collection(CLIENTS_COLLECTION)
      .where('isActive', '==', true)
      .get();

    // Collect normalized phones, prefer the most recent client per phone for
    // the denorm map.
    const phoneSet = new Set<string>();
    const clientsByPhone: Record<string, { id?: string; name?: string }> = {};

    for (const doc of snap.docs) {
      const data = { id: doc.id, ...(doc.data() as ClientDoc) };
      const candidatePhones = new Set<string>();

      // Top-level phone field.
      if (typeof data.phone === 'string' && data.phone.length > 0) {
        const n = normalizePhone(data.phone);
        if (n) candidatePhones.add(n);
      }

      // contactMethods[] — only phone/whatsapp types.
      if (Array.isArray(data.contactMethods)) {
        for (const cm of data.contactMethods) {
          if (cm?.type === 'phone' || cm?.type === 'whatsapp') {
            const v = typeof cm.value === 'string' ? cm.value : '';
            const n = normalizePhone(v);
            if (n) candidatePhones.add(n);
          }
        }
      }

      for (const phone of candidatePhones) {
        phoneSet.add(phone);
        clientsByPhone[phone] = { id: data.id, name: data.name };
      }
    }

    const phones = [...phoneSet];

    const jobPayload = {
      status: 'pending' as const,
      phones,
      clientsByPhone,
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    const jobRef = await adminDb.collection(SYNC_JOBS_COLLECTION).add(jobPayload);

    return NextResponse.json({
      success: true,
      data: {
        jobId: jobRef.id,
        phoneCount: phones.length,
      },
    });
  } catch (error) {
    console.error('Error creating whatsapp sync job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao iniciar sincronização',
      },
      { status: 500 }
    );
  }
}
