/**
 * Worker-local copies of WhatsApp domain types.
 *
 * Mirrors `src/types/whatsapp.ts` from the admin app, but uses
 * `firebase-admin/firestore` `Timestamp` (server SDK) instead of
 * `firebase/firestore` `Timestamp` (client SDK). The two types are
 * structurally similar but not identical, and the admin SDK is what the
 * worker uses to write Firestore docs.
 */

import { Timestamp } from 'firebase-admin/firestore';

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

export type WhatsAppMessageStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type WhatsAppConnectionState = 'pairing' | 'connecting' | 'connected' | 'disconnected';

export type WhatsAppOutboxStatus = 'pending' | 'sending' | 'sent' | 'failed';

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
   */
  profilePictureUrl?: string;
  profilePictureRefreshedAt?: Timestamp;
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  lastMessageDirection: WhatsAppMessageDirection;
  unreadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
  assignedTo?: string;
  status?: 'open' | 'closed';
}

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
