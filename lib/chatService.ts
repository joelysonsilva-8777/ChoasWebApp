import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  setDoc,
  limitToLast,
} from 'firebase/firestore';
import { AvatarComponents, normalizeAvatar, DEFAULT_AVATAR } from './avatarService';
import { getUserProfileService, UserProfile } from './userProfileService';
import {
  buildChatAttachmentStoragePath,
  resolveFirebaseStorageMediaSource,
  resolveStickerAssetSource,
  uploadBytesToFirebaseStorage,
} from './chatMedia';

export interface ChatMessage {
  messageId: string;
  documentId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: string;
  timestamp: Date;
  isOwn: boolean;
  senderAvatar?: AvatarComponents;
  senderProfilePhotoDataUri?: string;
  senderProfilePhotoStoragePath?: string;
  senderProfilePhotoSource?: string;
  stickerAsset?: string;
  stickerSource?: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  attachmentStoragePath?: string;
  attachmentSizeBytes?: number;
  attachmentPreviewDataUri?: string;
  attachmentPreviewSource?: string;
  mediaGroupId?: string;
  mediaGroupIndex?: number;
  mediaGroupCount?: number;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImageUrl?: string;
  linkSiteName?: string;
}

export interface Conversation {
  conversationId: string;
  userAId: string;
  userBId: string;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageType: string;
  userAName: string;
  userBName: string;
  userAAvatar?: AvatarComponents;
  userBAvatar?: AvatarComponents;
  userAProfilePhotoDataUri?: string;
  userBProfilePhotoDataUri?: string;
  userAProfilePhotoStoragePath?: string;
  userBProfilePhotoStoragePath?: string;
  userAProfilePhotoSource?: string;
  userBProfilePhotoSource?: string;
}

const conversationAvatarCache = new Map<string, Promise<UserProfile | null>>();
const mediaSourceCache = new Map<string, Promise<string | null>>();

export class ChatServiceTS {
  private currentUserId: string;
  private profileService = getUserProfileService();

  constructor(idToken: string, currentUserId: string) {
    void idToken;
    this.currentUserId = currentUserId;
  }

  private createConversationId(userId1: string, userId2: string): string {
    const ids = [userId1, userId2].sort();
    return `${ids[0]}-${ids[1]}`;
  }

  private async resolveMediaSource(source?: string | null): Promise<string | null> {
    if (!source) {
      return null;
    }

    const normalized = source.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith('data:') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    if (mediaSourceCache.has(normalized)) {
      return mediaSourceCache.get(normalized) ?? null;
    }

    const promise = resolveFirebaseStorageMediaSource(normalized);
    mediaSourceCache.set(normalized, promise);
    return promise;
  }

  private async resolveUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) {
      return null;
    }

    if (conversationAvatarCache.has(userId)) {
      return conversationAvatarCache.get(userId) ?? null;
    }

    const promise = this.profileService.getUserProfile(userId);
    conversationAvatarCache.set(userId, promise);
    return promise;
  }

  private normalizeAvatarFromProfile(profile: UserProfile | null | undefined): AvatarComponents {
    if (!profile) {
      return DEFAULT_AVATAR;
    }

    return normalizeAvatar({
      body: profile.avatar?.body,
      hair: profile.avatar?.hair,
      hat: profile.avatar?.hat,
      accessory: profile.avatar?.accessory,
      clothing: profile.avatar?.clothing,
    });
  }

  async loadConversationsAsync(): Promise<Conversation[]> {
    const conversations: Conversation[] = [];

    try {
      const db = getFirestore();
      const conversationsRef = collection(db, 'conversations');

      const [snapshotA, snapshotB] = await Promise.all([
        getDocs(query(conversationsRef, where('userAId', '==', this.currentUserId))),
        getDocs(query(conversationsRef, where('userBId', '==', this.currentUserId))),
      ]);

      const seenIds = new Set<string>();
      const userIdsToFetch = new Set<string>();

      const appendSnapshot = (snapshot: typeof snapshotA) => {
        snapshot.forEach((conversationDoc) => {
          const data = conversationDoc.data();
          const conversationId = data.conversationId || this.createConversationId(data.userAId, data.userBId);

          if (seenIds.has(conversationId)) {
            return;
          }

          seenIds.add(conversationId);
          conversations.push({
            conversationId,
            userAId: data.userAId || '',
            userBId: data.userBId || '',
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
            lastMessageType: data.lastMessageType || 'text',
            userAName: data.userAName || 'Usuário A',
            userBName: data.userBName || 'Usuário B',
          });

          if (data.userAId) {
            userIdsToFetch.add(data.userAId);
          }
          if (data.userBId) {
            userIdsToFetch.add(data.userBId);
          }
        });
      };

      appendSnapshot(snapshotA);
      appendSnapshot(snapshotB);

      const profilePairs = await Promise.all(
        Array.from(userIdsToFetch).map(async (userId) => [userId, await this.resolveUserProfile(userId)] as const),
      );
      const userProfiles = new Map<string, UserProfile>();

      profilePairs.forEach(([userId, profile]) => {
        if (profile) {
          userProfiles.set(userId, profile);
        }
      });

      conversations.forEach((conversation) => {
        const userAProfile = userProfiles.get(conversation.userAId);
        const userBProfile = userProfiles.get(conversation.userBId);

        conversation.userAAvatar = this.normalizeAvatarFromProfile(userAProfile);
        conversation.userBAvatar = this.normalizeAvatarFromProfile(userBProfile);
        conversation.userAProfilePhotoDataUri = userAProfile?.profilePhotoDataUri || userAProfile?.profilePhoto || '';
        conversation.userBProfilePhotoDataUri = userBProfile?.profilePhotoDataUri || userBProfile?.profilePhoto || '';
        conversation.userAProfilePhotoStoragePath = userAProfile?.profilePhotoStoragePath || '';
        conversation.userBProfilePhotoStoragePath = userBProfile?.profilePhotoStoragePath || '';
        conversation.userAProfilePhotoSource = userAProfile?.profilePhotoSource || userAProfile?.profilePhoto || '';
        conversation.userBProfilePhotoSource = userBProfile?.profilePhotoSource || userBProfile?.profilePhoto || '';
      });

      conversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      return conversations;
    } catch (error) {
      console.error('[ChatServiceTS.loadConversationsAsync] Error:', error);
      return conversations;
    }
  }

  async loadMessagesAsync(contactId: string, limit: number = 50): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    try {
      const db = getFirestore();
      const conversationId = this.createConversationId(this.currentUserId, contactId);
      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(Math.max(1, limit)));
      const snapshot = await getDocs(q);

      const senderIds = new Set<string>();

      snapshot.forEach((messageDoc) => {
        const data = messageDoc.data();

        const timestamp = data.timestamp?.toDate?.() || data.createdAt?.toDate?.() || new Date();
        messages.push({
          messageId: data.messageId || messageDoc.id,
          documentId: messageDoc.id,
          senderId: data.senderId || '',
          senderName: data.senderName || 'Usuário',
          content: data.content || '',
          messageType: data.messageType || 'text',
          timestamp,
          isOwn: data.senderId === this.currentUserId,
          stickerAsset: data.stickerAsset || '',
          attachmentFileName: data.attachmentFileName || '',
          attachmentContentType: data.attachmentContentType || '',
          attachmentStoragePath: data.attachmentStoragePath || '',
          attachmentSizeBytes: Number(data.attachmentSizeBytes || 0),
          attachmentPreviewDataUri: data.attachmentPreviewDataUri || '',
          mediaGroupId: data.mediaGroupId || '',
          mediaGroupIndex: Number(data.mediaGroupIndex || 0),
          mediaGroupCount: Number(data.mediaGroupCount || 0),
          linkUrl: data.linkUrl || '',
          linkTitle: data.linkTitle || '',
          linkDescription: data.linkDescription || '',
          linkImageUrl: data.linkImageUrl || '',
          linkSiteName: data.linkSiteName || '',
        });

        if (data.senderId) {
          senderIds.add(data.senderId);
        }
      });

      const senderProfiles = await this.profileService.getUsersByIds(Array.from(senderIds));

      await Promise.all(
        messages.map(async (message) => {
          const senderProfile = senderProfiles.get(message.senderId);
          if (senderProfile) {
            message.senderAvatar = senderProfile.avatar;
            message.senderProfilePhotoDataUri = senderProfile.profilePhotoDataUri || senderProfile.profilePhoto || '';
            message.senderProfilePhotoStoragePath = senderProfile.profilePhotoStoragePath || '';
            message.senderProfilePhotoSource = senderProfile.profilePhotoSource || senderProfile.profilePhoto || '';
          }

          if (message.attachmentPreviewDataUri) {
            message.attachmentPreviewSource = message.attachmentPreviewDataUri;
            return;
          }

          if (message.messageType === 'sticker' || message.stickerAsset) {
            message.stickerSource = resolveStickerAssetSource(message.stickerAsset);
            return;
          }

          if (message.messageType === 'image' && message.attachmentStoragePath) {
            message.attachmentPreviewSource = (await this.resolveMediaSource(message.attachmentStoragePath)) || undefined;
          }
        }),
      );

      messages.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
      return messages;
    } catch (error) {
      console.error('[ChatServiceTS.loadMessagesAsync] Error:', error);
      return messages;
    }
  }

  async sendMessageAsync(
    contactId: string,
    contactName: string,
    senderName: string,
    content: string,
    messageType: string = 'text',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getFirestore();
      const conversationId = this.createConversationId(this.currentUserId, contactId);
      const messageId = `msg_${Date.now()}`;
      const normalizedMessageType = messageType || 'text';

      const messageData = {
        messageId,
        senderId: this.currentUserId,
        senderName,
        content,
        messageType: normalizedMessageType,
        stickerAsset: '',
        attachmentFileName: '',
        attachmentContentType: '',
        attachmentStoragePath: '',
        attachmentSizeBytes: 0,
        attachmentPreviewDataUri: '',
        mediaGroupId: '',
        mediaGroupIndex: 0,
        mediaGroupCount: 0,
        linkUrl: '',
        linkTitle: '',
        linkDescription: '',
        linkImageUrl: '',
        linkSiteName: '',
        isEdited: false,
        isDeleted: false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        recipientId: contactId,
      };

      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      await addDoc(messagesRef, messageData);

      await this.upsertConversationMetadataAsync(
        this.currentUserId,
        contactId,
        contactName,
        senderName,
        content,
        normalizedMessageType,
      );

      return { success: true };
    } catch (error) {
      console.error('[ChatServiceTS.sendMessageAsync] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendStickerMessageAsync(
    contactId: string,
    contactName: string,
    senderName: string,
    stickerAsset: string,
  ): Promise<{ success: boolean; error?: string; message?: ChatMessage }> {
    try {
      const db = getFirestore();
      const conversationId = this.createConversationId(this.currentUserId, contactId);
      const messageId = `msg_${Date.now()}`;
      const normalizedStickerAsset = stickerAsset.trim();

      const outgoingMessage: ChatMessage = {
        messageId,
        documentId: messageId,
        senderId: this.currentUserId,
        senderName,
        content: normalizedStickerAsset,
        messageType: 'sticker',
        stickerAsset: normalizedStickerAsset,
        stickerSource: resolveStickerAssetSource(normalizedStickerAsset),
        timestamp: new Date(),
        isOwn: true,
      };

      const messageData = {
        messageId,
        senderId: this.currentUserId,
        senderName,
        content: normalizedStickerAsset,
        messageType: 'sticker',
        stickerAsset: normalizedStickerAsset,
        attachmentFileName: '',
        attachmentContentType: '',
        attachmentStoragePath: '',
        attachmentSizeBytes: 0,
        attachmentPreviewDataUri: '',
        mediaGroupId: '',
        mediaGroupIndex: 0,
        mediaGroupCount: 0,
        linkUrl: '',
        linkTitle: '',
        linkDescription: '',
        linkImageUrl: '',
        linkSiteName: '',
        isEdited: false,
        isDeleted: false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        recipientId: contactId,
      };

      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      await addDoc(messagesRef, messageData);

      await this.upsertConversationMetadataAsync(
        this.currentUserId,
        contactId,
        contactName,
        senderName,
        'Figurinha enviada',
        'sticker',
      );

      return { success: true, message: outgoingMessage };
    } catch (error) {
      console.error('[ChatServiceTS.sendStickerMessageAsync] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendAttachmentMessageAsync(
    contactId: string,
    contactName: string,
    senderName: string,
    file: File,
    caption?: string,
    previewDataUri?: string,
    mediaGroupId?: string,
    mediaGroupIndex: number = 0,
    mediaGroupCount: number = 0,
  ): Promise<{ success: boolean; error?: string; message?: ChatMessage }> {
    try {
      const db = getFirestore();
      const conversationId = this.createConversationId(this.currentUserId, contactId);
      const messageId = `msg_${Date.now()}`;
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      const storagePath = buildChatAttachmentStoragePath(conversationId, this.currentUserId, messageId, file.name);
      const attachmentPreviewDataUri = previewDataUri?.trim() || '';
      const uploadUrl = await uploadBytesToFirebaseStorage(storagePath, file, file.type || 'application/octet-stream');

      if (!uploadUrl) {
        return { success: false, error: 'Não foi possível enviar o anexo ao Firebase Storage.' };
      }

      const messageContent = caption?.trim() || (messageType === 'image' ? `Imagem • ${file.name}` : `Arquivo • ${file.name}`);
      const timestamp = new Date();
      const outgoingMessage: ChatMessage = {
        messageId,
        documentId: messageId,
        senderId: this.currentUserId,
        senderName,
        content: messageContent,
        messageType,
        timestamp,
        isOwn: true,
        attachmentFileName: file.name,
        attachmentContentType: file.type || 'application/octet-stream',
        attachmentStoragePath: storagePath,
        attachmentSizeBytes: file.size,
        attachmentPreviewDataUri,
        attachmentPreviewSource: attachmentPreviewDataUri || uploadUrl,
        mediaGroupId: mediaGroupId?.trim() || '',
        mediaGroupIndex: Math.max(0, mediaGroupIndex),
        mediaGroupCount: Math.max(0, mediaGroupCount),
      };

      const messageData = {
        messageId,
        senderId: this.currentUserId,
        senderName,
        content: messageContent,
        messageType,
        stickerAsset: '',
        attachmentFileName: file.name,
        attachmentContentType: file.type || 'application/octet-stream',
        attachmentStoragePath: storagePath,
        attachmentSizeBytes: file.size,
        attachmentPreviewDataUri,
        mediaGroupId: outgoingMessage.mediaGroupId || '',
        mediaGroupIndex: outgoingMessage.mediaGroupIndex || 0,
        mediaGroupCount: outgoingMessage.mediaGroupCount || 0,
        linkUrl: '',
        linkTitle: '',
        linkDescription: '',
        linkImageUrl: '',
        linkSiteName: '',
        isEdited: false,
        isDeleted: false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        recipientId: contactId,
      };

      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      await addDoc(messagesRef, messageData);

      await this.upsertConversationMetadataAsync(
        this.currentUserId,
        contactId,
        contactName,
        senderName,
        outgoingMessage.content,
        messageType,
      );

      return { success: true, message: outgoingMessage };
    } catch (error) {
      console.error('[ChatServiceTS.sendAttachmentMessageAsync] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async upsertConversationMetadataAsync(
    userAId: string,
    userBId: string,
    userBName: string,
    userAName: string,
    lastMessage: string,
    messageType: string,
  ): Promise<void> {
    try {
      const db = getFirestore();
      const conversationId = this.createConversationId(userAId, userBId);
      const conversationRef = doc(db, 'conversations', conversationId);
      const [currentProfile, otherProfile] = await Promise.all([
        this.resolveUserProfile(userAId),
        this.resolveUserProfile(userBId),
      ]);

      await setDoc(
        conversationRef,
        {
          conversationId,
          userAId,
          userBId,
          userAName,
          userBName,
          lastMessage,
          lastMessageTime: new Date(),
          lastMessageType: messageType,
          userAAvatarBody: currentProfile?.avatar?.body || '',
          userAAvatarHair: currentProfile?.avatar?.hair || '',
          userAAvatarHat: currentProfile?.avatar?.hat || '',
          userAAvatarAccessory: currentProfile?.avatar?.accessory || '',
          userAAvatarClothing: currentProfile?.avatar?.clothing || '',
          userBAvatarBody: otherProfile?.avatar?.body || '',
          userBAvatarHair: otherProfile?.avatar?.hair || '',
          userBAvatarHat: otherProfile?.avatar?.hat || '',
          userBAvatarAccessory: otherProfile?.avatar?.accessory || '',
          userBAvatarClothing: otherProfile?.avatar?.clothing || '',
          userAProfilePhotoDataUri: currentProfile?.profilePhotoDataUri || currentProfile?.profilePhoto || '',
          userBProfilePhotoDataUri: otherProfile?.profilePhotoDataUri || otherProfile?.profilePhoto || '',
          userAProfilePhotoStoragePath: currentProfile?.profilePhotoStoragePath || '',
          userBProfilePhotoStoragePath: otherProfile?.profilePhotoStoragePath || '',
          userAProfilePhotoSource: currentProfile?.profilePhotoSource || currentProfile?.profilePhoto || '',
          userBProfilePhotoSource: otherProfile?.profilePhotoSource || otherProfile?.profilePhoto || '',
        },
        { merge: true },
      );
    } catch (error) {
      console.error('[ChatServiceTS.upsertConversationMetadata] Error:', error);
    }
  }
}
