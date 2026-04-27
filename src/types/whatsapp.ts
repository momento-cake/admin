import { Timestamp } from 'firebase/firestore';

export type WhatsAppMessageDirection = 'in' | 'out';

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'document'
  | 'video'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'system';

export type WhatsAppMessageStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type WhatsAppConnectionState = 'pairing' | 'connecting' | 'connected' | 'disconnected';

export type WhatsAppOutboxStatus = 'pending' | 'sending' | 'sent' | 'failed';

/**
 * `whatsapp_status/{instanceId}` — single doc reflecting worker state.
 * Both worker (writer) and admin app (reader for the UI) touch this doc.
 */
export interface WhatsAppStatus {
  instanceId: string;
  state: WhatsAppConnectionState;
  qr?: string;
  qrExpiresAt?: Timestamp;
  lastHeartbeatAt?: Timestamp;
  lastError?: string;
  workerInstanceId?: string;
  lockExpiresAt?: Timestamp;
  pairedPhone?: string;
  updatedAt: Timestamp;
}

/**
 * `whatsapp_conversations/{conversationId}` — one per phone number.
 * conversationId == normalized phone (e.g. "5511999999999").
 *
 * `placeholder: true` rows are CRM-side cross-references created by the
 * "Sincronizar contatos do CRM" job. They have no messages yet — atendentes
 * see them in the inbox so they can initiate the first conversation. As soon
 * as a message arrives (in or out), they flip to a normal conversation.
 *
 * `lastMessageAt` is nullable for placeholders. For real conversations it is
 * always set; component code should treat `null` as "no messages yet."
 */
export interface WhatsAppConversation {
  id: string;
  phone: string;
  phoneRaw: string;
  clienteId?: string;
  clienteNome?: string;
  whatsappName?: string;
  /**
   * Cached WhatsApp profile picture URL. Signed by WhatsApp's CDN and
   * expires in ~24h, so the worker re-fetches every ~20h on inbound traffic.
   * Absent when the contact has no public photo or has hidden it.
   */
  profilePictureUrl?: string;
  /** When the worker last successfully attempted to fetch the photo URL. */
  profilePictureRefreshedAt?: Timestamp;
  lastMessageAt: Timestamp | null;
  lastMessagePreview: string;
  lastMessageDirection: WhatsAppMessageDirection;
  unreadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** True iff this row was created by the CRM cross-reference job and has
   * not yet seen a real message. */
  placeholder?: boolean;
  // Reserved for post-MVP expansion. Kept in the type so reads never blow up.
  tags?: string[];
  assignedTo?: string;
  status?: 'open' | 'closed';
}

/**
 * `whatsapp_sync_jobs/{jobId}` — admin-triggered cross-reference job.
 * Admin writes pending; worker processes; admin watches doc for completion.
 */
export type WhatsAppSyncJobStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface WhatsAppSyncJob {
  id: string;
  status: WhatsAppSyncJobStatus;
  /** Phones to check, normalized (digits, no '+'). */
  phones: string[];
  /** Optional denorm map { phone → { id, name } } the worker uses to populate
   * the placeholder conversation with client metadata. */
  clientsByPhone?: Record<string, { id?: string; name?: string }>;
  /** Aggregate counts populated by the worker on completion. */
  matched?: number;
  created?: number;
  skipped?: number;
  error?: string;
  createdBy?: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  failedAt?: Timestamp;
}

/**
 * `whatsapp_messages/{messageId}` — flat collection (not subcollection)
 * for cross-conversation queries.
 */
export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  whatsappMessageId: string;
  direction: WhatsAppMessageDirection;
  type: WhatsAppMessageType;
  text?: string;
  mediaPath?: string;
  status?: WhatsAppMessageStatus;
  failureReason?: string;
  authorUserId?: string;
  timestamp: Timestamp;
  createdAt: Timestamp;
}

/**
 * `whatsapp_outbox/{outboxId}` — write-only queue for outgoing messages.
 * Admin writes, worker drains.
 */
export interface WhatsAppOutboxItem {
  id: string;
  conversationId: string;
  to: string;
  text: string;
  status: WhatsAppOutboxStatus;
  attempts: number;
  lastAttemptAt?: Timestamp;
  error?: string;
  whatsappMessageId?: string;
  authorUserId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Input shape for `POST /api/whatsapp/conversations/[id]/send`.
 */
export interface SendMessageInput {
  text: string;
}

/**
 * Input shape for `POST /api/whatsapp/conversations/[id]/link-client`.
 */
export interface LinkClientInput {
  clientId: string;
}

/**
 * Input shape for `POST /api/whatsapp/conversations/[id]/quick-create-client`.
 */
export interface QuickCreateClientInput {
  name: string;
}
