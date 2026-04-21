import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const mediaSourceCache = new Map<string, Promise<string | null>>();

export const STICKER_ASSETS = [
  'Chao_0.png',
  'Chao_1.png',
  'chao_2.png',
  'chao_3.png',
  'chao_4.png',
  'chao_5.png',
  'chao_6.png',
] as const;

const stickerLookup = new Map<string, string>(
  STICKER_ASSETS.map((assetName) => [assetName.toLowerCase(), assetName]),
);

export const isDataUrl = (value?: string | null): boolean => {
  return typeof value === 'string' && /^data:/i.test(value.trim());
};

export const isRemoteUrl = (value?: string | null): boolean => {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
};

export const isFirebaseStoragePath = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  return !isDataUrl(normalized) && !isRemoteUrl(normalized) && !normalized.startsWith('blob:');
};

export const sanitizeStorageSegment = (value?: string | null): string => {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return 'unknown';
  }

  const sanitized = normalized
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'unknown';
};

export const sanitizeStorageFileName = (fileName?: string | null): string => {
  const normalized = (fileName ?? 'arquivo.bin').trim() || 'arquivo.bin';
  return normalized
    .replace(/[\\/]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_.-]/g, '-');
};

export const buildChatAttachmentStoragePath = (
  conversationId: string,
  ownerUserId: string,
  messageId: string,
  fileName: string,
): string => {
  return `chat-assets/${sanitizeStorageSegment(conversationId)}/${sanitizeStorageSegment(ownerUserId)}/${sanitizeStorageSegment(messageId)}/${sanitizeStorageFileName(fileName)}`;
};

export const resolveFirebaseStorageMediaSource = async (
  source?: string | null,
): Promise<string | null> => {
  if (!source) {
    return null;
  }

  const normalized = source.trim();
  if (!normalized) {
    return null;
  }

  if (isDataUrl(normalized) || isRemoteUrl(normalized)) {
    return normalized;
  }

  if (mediaSourceCache.has(normalized)) {
    return mediaSourceCache.get(normalized) ?? null;
  }

  const resolvedPromise = (async () => {
    try {
      const downloadUrl = await getDownloadURL(ref(storage, normalized));
      return downloadUrl;
    } catch (error) {
      console.warn('[chatMedia] Não foi possível resolver Storage URL:', normalized, error);
      return null;
    }
  })();

  mediaSourceCache.set(normalized, resolvedPromise);
  return resolvedPromise;
};

export const uploadBytesToFirebaseStorage = async (
  storagePath: string,
  file: Blob,
  contentType?: string,
): Promise<string | null> => {
  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, contentType ? { contentType } : undefined);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('[chatMedia] Falha ao enviar arquivo para Storage:', error);
    return null;
  }
};

export const resolveStickerAssetSource = (assetName?: string | null): string => {
  if (!assetName) {
    return '';
  }

  const normalized = assetName.trim();
  if (!normalized) {
    return '';
  }

  const resolvedAssetName = stickerLookup.get(normalized.toLowerCase()) || normalized;
  return `/img/emojiobsseract/${resolvedAssetName}`;
};

