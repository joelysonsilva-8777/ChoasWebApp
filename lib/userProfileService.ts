import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { AvatarComponents, DEFAULT_AVATAR, normalizeAvatar } from './avatarService';
import {
  isDataUrl,
  resolveFirebaseStorageMediaSource,
  sanitizeStorageSegment,
  uploadBytesToFirebaseStorage,
} from './chatMedia';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role?: string;
  avatar: AvatarComponents;
  profilePhoto?: string;
  profilePhotoDataUri?: string;
  profilePhotoStoragePath?: string;
  profilePhotoSource?: string;
  headline?: string;
  course?: string;
  registration?: string;
  academicDepartment?: string;
  academicFocus?: string;
  bio?: string;
  professionalSummary?: string;
  programmingLanguages?: string;
  phoneNumber?: string;
  companyName?: string;
  companyLegalName?: string;
  companyCnpj?: string;
  companySegment?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyContactName?: string;
  companyContactRole?: string;
  companyDescription?: string;
  calendarEntries?: UserCalendarEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileCreationOptions {
  role?: string;
  headline?: string;
  course?: string;
  registration?: string;
  academicDepartment?: string;
  academicFocus?: string;
  bio?: string;
  professionalSummary?: string;
  programmingLanguages?: string;
  phoneNumber?: string;
  companyName?: string;
  companyLegalName?: string;
  companyCnpj?: string;
  companySegment?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyContactName?: string;
  companyContactRole?: string;
  companyDescription?: string;
}

export interface UserCalendarEntry {
  entryId: string;
  date: string;
  entryType: string;
  contextLabel: string;
  title: string;
  notes: string;
  createdAt: string;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);

  if (!match) {
    throw new Error('Formato inválido de imagem de perfil.');
  }

  const contentType = match[1] || 'image/jpeg';
  const base64Data = match[2] || '';
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return {
    blob: new Blob([bytes], { type: contentType }),
    contentType,
  };
}

function getProfilePhotoStoragePath(userId: string, contentType: string): string {
  const extensionByMimeType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };

  const normalizedMimeType = contentType.toLowerCase();
  const extension = extensionByMimeType[normalizedMimeType] || 'png';

  return `profile-photos/${sanitizeStorageSegment(userId)}/profile-photo.${extension}`;
}

export class UserProfileService {
  private profileCache = new Map<string, Promise<UserProfile | null>>();

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (this.profileCache.has(userId)) {
      return this.profileCache.get(userId) ?? null;
    }

    const profilePromise = this.loadUserProfile(userId);
    this.profileCache.set(userId, profilePromise);

    return profilePromise;
  }

  private async loadUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const data = userSnap.data();
      
      // Normalize avatar from both old (.NET) and new formats
      const avatarData = {
        body: data.avatarBody || data.body,
        hair: data.avatarHair || data.hair,
        hat: data.avatarHat || data.hat,
        accessory: data.avatarAccessory || data.accessory,
        clothing: data.avatarClothing || data.clothing,
      };

      const profilePhotoDataUri = data.profilePhotoDataUri || data.profilePhoto || '';
      const profilePhotoStoragePath = data.profilePhotoStoragePath || data.profilePhotoStorage || '';
      const profilePhotoUrl = data.profilePhotoUrl || data.profilePhotoSource || '';
      const profilePhotoSource =
        (typeof profilePhotoDataUri === 'string' && profilePhotoDataUri.trim()) ||
        (typeof profilePhotoUrl === 'string' && profilePhotoUrl.trim()) ||
        (await resolveFirebaseStorageMediaSource(profilePhotoStoragePath)) ||
        '';

      const calendarEntries = Array.isArray(data.calendarEntries)
        ? data.calendarEntries.map((entry: any, index: number) => ({
            entryId: typeof entry?.entryId === 'string' && entry.entryId.trim() ? entry.entryId : `calendar-${index}`,
            date: typeof entry?.date === 'string' && entry.date.trim() ? entry.date : new Date().toISOString(),
            entryType: typeof entry?.entryType === 'string' ? entry.entryType : 'Aviso',
            contextLabel: typeof entry?.contextLabel === 'string' ? entry.contextLabel : 'Professor',
            title: typeof entry?.title === 'string' ? entry.title : '',
            notes: typeof entry?.notes === 'string' ? entry.notes : '',
            createdAt: typeof entry?.createdAt === 'string' && entry.createdAt.trim() ? entry.createdAt : new Date().toISOString(),
          }))
        : [];

      return {
        userId,
        email: data.email || '',
        displayName: data.displayName || data.companyName || data.companyLegalName || '',
        role: data.role || 'student',
        avatar: normalizeAvatar(avatarData),
        profilePhoto: profilePhotoSource,
        profilePhotoDataUri: profilePhotoDataUri || '',
        profilePhotoStoragePath: profilePhotoStoragePath || '',
        profilePhotoSource: profilePhotoSource || '',
        headline: data.headline || '',
        course: data.course || '',
        registration: data.registration || '',
        academicDepartment: data.academicDepartment || '',
        academicFocus: data.academicFocus || '',
        bio: data.bio || '',
        professionalSummary: data.professionalSummary || data.bio || '',
        programmingLanguages: data.programmingLanguages || '',
        phoneNumber: data.phoneNumber || data.phone || '',
        companyName: data.companyName || '',
        companyLegalName: data.companyLegalName || '',
        companyCnpj: data.companyCnpj || '',
        companySegment: data.companySegment || '',
        companyPhone: data.companyPhone || '',
        companyWebsite: data.companyWebsite || '',
        companyContactName: data.companyContactName || '',
        companyContactRole: data.companyContactRole || '',
        companyDescription: data.companyDescription || '',
        calendarEntries,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }

  async createUserProfile(
    userId: string,
    email: string,
    displayName: string,
    avatar: AvatarComponents = DEFAULT_AVATAR,
    options: UserProfileCreationOptions = {}
  ): Promise<UserProfile> {
    try {
      const db = getFirestore();
      const now = new Date();

      const profile: UserProfile = {
        userId,
        email,
        displayName,
        role: options.role || 'student',
        avatar,
        headline: options.headline || '',
        course: options.course || '',
        registration: options.registration || '',
        academicDepartment: options.academicDepartment || '',
        academicFocus: options.academicFocus || '',
        bio: options.bio || '',
        professionalSummary: options.professionalSummary || '',
        programmingLanguages: options.programmingLanguages || '',
        phoneNumber: options.phoneNumber || '',
        companyName: options.companyName || '',
        companyLegalName: options.companyLegalName || '',
        companyCnpj: options.companyCnpj || '',
        companySegment: options.companySegment || '',
        companyPhone: options.companyPhone || '',
        companyWebsite: options.companyWebsite || '',
        companyContactName: options.companyContactName || '',
        companyContactRole: options.companyContactRole || '',
        companyDescription: options.companyDescription || '',
        createdAt: now,
        updatedAt: now,
      };

      const userRef = doc(db, 'users', userId);
      // Save with both .NET field names (avatarBody, etc) for compatibility
      await setDoc(userRef, {
        email,
        displayName,
        role: options.role || 'student',
        headline: options.headline || '',
        course: options.course || '',
        registration: options.registration || '',
        academicDepartment: options.academicDepartment || '',
        academicFocus: options.academicFocus || '',
        bio: options.bio || '',
        professionalSummary: options.professionalSummary || '',
        programmingLanguages: options.programmingLanguages || '',
        phoneNumber: options.phoneNumber || '',
        companyName: options.companyName || '',
        companyLegalName: options.companyLegalName || '',
        companyCnpj: options.companyCnpj || '',
        companySegment: options.companySegment || '',
        companyPhone: options.companyPhone || '',
        companyWebsite: options.companyWebsite || '',
        companyContactName: options.companyContactName || '',
        companyContactRole: options.companyContactRole || '',
        companyDescription: options.companyDescription || '',
        avatarBody: avatar.body,
        avatarHair: avatar.hair,
        avatarHat: avatar.hat,
        avatarAccessory: avatar.accessory,
        avatarClothing: avatar.clothing,
        // Also save in new format
        body: avatar.body,
        hair: avatar.hair,
        hat: avatar.hat,
        accessory: avatar.accessory,
        clothing: avatar.clothing,
        createdAt: now,
        updatedAt: now,
      });

      return profile;
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      throw error;
    }
  }

  async updateUserAvatar(userId: string, avatar: AvatarComponents): Promise<void> {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      // Update with both formats for .NET compatibility
      await updateDoc(userRef, {
        avatarBody: avatar.body,
        avatarHair: avatar.hair,
        avatarHat: avatar.hat,
        avatarAccessory: avatar.accessory,
        avatarClothing: avatar.clothing,
        body: avatar.body,
        hair: avatar.hair,
        hat: avatar.hat,
        accessory: avatar.accessory,
        clothing: avatar.clothing,
        updatedAt: new Date(),
      });

      this.profileCache.delete(userId);
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);

      const sanitizedUpdates: Record<string, unknown> = { ...updates };
      const photoCandidate =
        typeof updates.profilePhotoDataUri === 'string' && updates.profilePhotoDataUri.trim()
          ? updates.profilePhotoDataUri.trim()
          : typeof updates.profilePhoto === 'string' && updates.profilePhoto.trim()
            ? updates.profilePhoto.trim()
            : typeof updates.profilePhotoSource === 'string' && updates.profilePhotoSource.trim()
              ? updates.profilePhotoSource.trim()
              : '';

      if (photoCandidate && isDataUrl(photoCandidate)) {
        try {
          const { blob, contentType } = dataUrlToBlob(photoCandidate);
          const storagePath = getProfilePhotoStoragePath(userId, contentType);
          const downloadUrl = await uploadBytesToFirebaseStorage(storagePath, blob, contentType);

          if (!downloadUrl) {
            throw new Error('Não foi possível enviar a foto de perfil para o Firebase Storage.');
          }

          sanitizedUpdates.profilePhotoStoragePath = storagePath;
          sanitizedUpdates.profilePhotoSource = downloadUrl;
          sanitizedUpdates.profilePhotoUrl = downloadUrl;
          sanitizedUpdates.profilePhoto = downloadUrl;
          sanitizedUpdates.profilePhotoDataUri = '';
        } catch (photoError) {
          console.warn('[userProfileService] Falha ao enviar foto de perfil. Salvando perfil sem a nova imagem.', photoError);
          delete sanitizedUpdates.profilePhotoDataUri;
          delete sanitizedUpdates.profilePhoto;
          delete sanitizedUpdates.profilePhotoSource;
          delete sanitizedUpdates.profilePhotoUrl;
        }
      } else if (photoCandidate) {
        sanitizedUpdates.profilePhotoSource = photoCandidate;
        sanitizedUpdates.profilePhotoUrl = photoCandidate;
        sanitizedUpdates.profilePhoto = photoCandidate;
      }

      const payload = Object.fromEntries(
        Object.entries(sanitizedUpdates).filter(([, value]) => value !== undefined),
      );

      await updateDoc(userRef, {
        ...payload,
        updatedAt: new Date(),
      });

      this.profileCache.delete(userId);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  async getUsersByIds(userIds: string[]): Promise<Map<string, UserProfile>> {
    try {
      const profiles = new Map<string, UserProfile>();

      const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
      const results = await Promise.all(uniqueUserIds.map((userId) => this.getUserProfile(userId)));

      results.forEach((profile, index) => {
        if (profile) {
          profiles.set(uniqueUserIds[index], profile);
        }
      });

      return profiles;
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
      return new Map();
    }
  }
}

// Singleton instance
let userProfileServiceInstance: UserProfileService | null = null;

export function getUserProfileService(): UserProfileService {
  if (!userProfileServiceInstance) {
    userProfileServiceInstance = new UserProfileService();
  }
  return userProfileServiceInstance;
}
