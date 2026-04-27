/**
 * Client SDK for WhatsApp data on Firestore.
 *
 * The admin app talks to Firestore directly via this module for reads and
 * realtime subscriptions. Writes that mutate state (sending messages, linking
 * clients, etc.) go through the API routes under /api/whatsapp/*, never
 * straight from the client — that's where permission checks live.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit as firestoreLimit,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
  type Query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppStatus,
} from '@/types/whatsapp';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';
const MESSAGES_COLLECTION = 'whatsapp_messages';
const STATUS_COLLECTION = 'whatsapp_status';
const STATUS_DOC_ID = 'primary';

// ---------------------------------------------------------------------------
// Document mappers
// ---------------------------------------------------------------------------

function docToConversation(snap: DocumentSnapshot<DocumentData>): WhatsAppConversation {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    phone: data.phone,
    phoneRaw: data.phoneRaw,
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    whatsappName: data.whatsappName,
    // Placeholders intentionally have a null lastMessageAt — see WhatsAppConversation.
    lastMessageAt: data.lastMessageAt ?? null,
    lastMessagePreview: data.lastMessagePreview ?? '',
    lastMessageDirection: data.lastMessageDirection ?? 'in',
    unreadCount: data.unreadCount ?? 0,
    placeholder: data.placeholder === true ? true : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    tags: data.tags,
    assignedTo: data.assignedTo,
    status: data.status,
  };
}

function docToMessage(snap: DocumentSnapshot<DocumentData>): WhatsAppMessage {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    conversationId: data.conversationId,
    whatsappMessageId: data.whatsappMessageId,
    direction: data.direction,
    type: data.type,
    text: data.text,
    mediaPath: data.mediaPath,
    status: data.status,
    failureReason: data.failureReason,
    authorUserId: data.authorUserId,
    timestamp: data.timestamp,
    createdAt: data.createdAt,
  };
}

function docToStatus(snap: DocumentSnapshot<DocumentData>): WhatsAppStatus | null {
  if (!snap.exists()) return null;
  const data = snap.data() ?? {};
  return {
    instanceId: data.instanceId ?? snap.id,
    state: data.state,
    qr: data.qr,
    qrExpiresAt: data.qrExpiresAt,
    lastHeartbeatAt: data.lastHeartbeatAt,
    lastError: data.lastError,
    workerInstanceId: data.workerInstanceId,
    lockExpiresAt: data.lockExpiresAt,
    pairedPhone: data.pairedPhone,
    updatedAt: data.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

interface FetchConversationsFilters {
  search?: string;
  limit?: number;
  clienteId?: string;
}

function buildConversationsQuery(filters?: FetchConversationsFilters): Query<DocumentData> {
  const parts: unknown[] = [collection(db, CONVERSATIONS_COLLECTION)];
  if (filters?.clienteId) {
    parts.push(where('clienteId', '==', filters.clienteId));
  }
  parts.push(orderBy('lastMessageAt', 'desc'));
  if (filters?.limit) {
    parts.push(firestoreLimit(filters.limit));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return query(...(parts as [any, ...any[]]));
}

function applyConversationSearch(
  conversations: WhatsAppConversation[],
  search?: string
): WhatsAppConversation[] {
  if (!search) return conversations;
  const lower = search.toLowerCase();
  return conversations.filter((c) => {
    const nameMatch = c.clienteNome?.toLowerCase().includes(lower) ?? false;
    const phoneMatch = c.phone?.toLowerCase().includes(lower) ?? false;
    return nameMatch || phoneMatch;
  });
}

export async function fetchConversations(
  filters?: FetchConversationsFilters
): Promise<WhatsAppConversation[]> {
  const q = buildConversationsQuery(filters);
  const snapshot = await getDocs(q);
  const conversations = snapshot.docs.map(docToConversation);
  return applyConversationSearch(conversations, filters?.search);
}

export async function fetchConversation(id: string): Promise<WhatsAppConversation | null> {
  const ref = doc(db, CONVERSATIONS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToConversation(snap);
}

export function subscribeToConversations(
  callback: (conversations: WhatsAppConversation[]) => void
): () => void {
  const q = buildConversationsQuery();
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.docs.map(docToConversation));
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

interface FetchMessagesOptions {
  limit?: number;
  before?: Timestamp;
}

function buildMessagesQuery(conversationId: string, opts?: FetchMessagesOptions): Query<DocumentData> {
  const parts: unknown[] = [
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId),
  ];
  if (opts?.before) {
    parts.push(where('timestamp', '<', opts.before));
  }
  parts.push(orderBy('timestamp', 'asc'));
  if (opts?.limit) {
    parts.push(firestoreLimit(opts.limit));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return query(...(parts as [any, ...any[]]));
}

export async function fetchMessages(
  conversationId: string,
  opts?: FetchMessagesOptions
): Promise<WhatsAppMessage[]> {
  const q = buildMessagesQuery(conversationId, opts);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToMessage);
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: WhatsAppMessage[]) => void
): () => void {
  const q = buildMessagesQuery(conversationId);
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    callback(snapshot.docs.map(docToMessage));
  });
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

function statusDocRef() {
  return doc(db, STATUS_COLLECTION, STATUS_DOC_ID);
}

export async function getStatus(): Promise<WhatsAppStatus | null> {
  const snap = await getDoc(statusDocRef());
  return docToStatus(snap);
}

export function subscribeToStatus(
  callback: (status: WhatsAppStatus | null) => void
): () => void {
  return onSnapshot(statusDocRef(), (snap) => {
    callback(docToStatus(snap));
  });
}
