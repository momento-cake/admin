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
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  lastMessageDirection: WhatsAppMessageDirection;
  unreadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Reserved for post-MVP expansion. Kept in the type so reads never blow up.
  tags?: string[];
  assignedTo?: string;
  status?: 'open' | 'closed';
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
