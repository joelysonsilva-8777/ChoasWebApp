import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AvatarComponents, DEFAULT_AVATAR, normalizeAvatar } from './avatarService';
import { resolveFirebaseStorageMediaSource } from './chatMedia';
import type { UserProfile } from './userProfileService';

export interface ConnectionEntry {
  userId: string;
  connectionId: string;
  connectedUserId: string;
  connectedUserName: string;
  connectedUserEmail: string;
  requestedBy: string;
  status: string;
  notificationType: string;
  notificationMessage: string;
  isRead: boolean;
  addedAt: string;
  updatedAt: string;
}

export interface ConnectionDirectoryUser {
  userId: string;
  name: string;
  email: string;
  registration: string;
  course: string;
  role: string;
  professionalTitle: string;
  academicDepartment: string;
  academicFocus: string;
  headline: string;
  profilePhotoDataUri: string;
  profilePhotoSource: string;
  avatar: AvatarComponents;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asDateString(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

function toDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function createConnectionId(userAId: string, userBId: string): string {
  return [userAId, userBId].sort((left, right) => left.localeCompare(right)).join('_');
}

function parseConnectionEntry(data: Record<string, unknown>): ConnectionEntry {
  return {
    userId: asString(data.userId),
    connectionId: asString(data.connectionId),
    connectedUserId: asString(data.connectedUserId),
    connectedUserName: asString(data.connectedUserName),
    connectedUserEmail: asString(data.connectedUserEmail),
    requestedBy: asString(data.requestedBy),
    status: asString(data.status, 'pendingOutgoing'),
    notificationType: asString(data.notificationType),
    notificationMessage: asString(data.notificationMessage),
    isRead: Boolean(data.isRead),
    addedAt: asDateString(data.addedAt),
    updatedAt: asDateString(data.updatedAt),
  };
}

export async function loadConnectionEntries(userId: string): Promise<ConnectionEntry[]> {
  const db = getFirestore();
  const snapshot = await getDocs(query(collection(db, 'userConnections'), where('userId', '==', userId)));

  return snapshot.docs
    .map((document) => parseConnectionEntry(document.data()))
    .sort((left, right) => toDate(right.updatedAt).getTime() - toDate(left.updatedAt).getTime());
}

export async function loadConnectionDirectory(): Promise<ConnectionDirectoryUser[]> {
  const db = getFirestore();
  const snapshot = await getDocs(collection(db, 'users'));

  return Promise.all(snapshot.docs.map(async (document) => {
    const data = document.data();
    const profilePhotoDataUri = asString(data.profilePhotoDataUri || data.profilePhoto || '');
    const profilePhotoStoragePath = asString(data.profilePhotoStoragePath || data.profilePhotoStorage || '');
    const profilePhotoSource =
      profilePhotoDataUri ||
      asString(data.profilePhotoUrl || data.profilePhotoSource || '') ||
      ((profilePhotoStoragePath ? await resolveFirebaseStorageMediaSource(profilePhotoStoragePath) : '') || '');

    return {
      userId: document.id,
      name: asString(data.displayName || data.name || 'Usuário'),
      email: asString(data.email),
      registration: asString(data.registration),
      course: asString(data.course),
      role: asString(data.role, 'student'),
      professionalTitle: asString(data.professionalTitle),
      academicDepartment: asString(data.academicDepartment),
      academicFocus: asString(data.academicFocus),
      headline: asString(data.headline || data.bio || ''),
      profilePhotoDataUri,
      profilePhotoSource,
      avatar: normalizeAvatar(data),
    };
  }));
}

export async function loadConnectionsSummary(userId: string): Promise<{
  entries: ConnectionEntry[];
  incoming: ConnectionEntry[];
  outgoing: ConnectionEntry[];
  active: ConnectionEntry[];
  notifications: ConnectionEntry[];
}> {
  const entries = await loadConnectionEntries(userId);
  return {
    entries,
    incoming: entries.filter((entry) => entry.status === 'pendingIncoming'),
    outgoing: entries.filter((entry) => entry.status === 'pendingOutgoing'),
    active: entries.filter((entry) => entry.status === 'connected'),
    notifications: entries.filter((entry) => Boolean(entry.notificationType) && !entry.isRead),
  };
}

export async function sendConnectionRequest(currentUser: UserProfile, targetUser: ConnectionDirectoryUser): Promise<void> {
  const db = getFirestore();
  const connectionId = createConnectionId(currentUser.userId, targetUser.userId);
  const now = new Date();

  await setDoc(doc(db, 'connections', connectionId), {
    connectionId,
    userAId: [currentUser.userId, targetUser.userId].sort((left, right) => left.localeCompare(right))[0],
    userBId: [currentUser.userId, targetUser.userId].sort((left, right) => left.localeCompare(right))[1],
    userIds: [currentUser.userId, targetUser.userId].sort((left, right) => left.localeCompare(right)),
    requestedBy: currentUser.userId,
    respondedBy: '',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, 'userConnections', `${currentUser.userId}_${connectionId}`), {
    userId: currentUser.userId,
    connectionId,
    connectedUserId: targetUser.userId,
    connectedUserName: targetUser.name,
    connectedUserEmail: targetUser.email,
    requestedBy: currentUser.userId,
    status: 'pendingOutgoing',
    notificationType: '',
    notificationMessage: '',
    isRead: true,
    addedAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, 'userConnections', `${targetUser.userId}_${connectionId}`), {
    userId: targetUser.userId,
    connectionId,
    connectedUserId: currentUser.userId,
    connectedUserName: currentUser.displayName,
    connectedUserEmail: currentUser.email,
    requestedBy: currentUser.userId,
    status: 'pendingIncoming',
    notificationType: 'request',
    notificationMessage: `${currentUser.displayName} quer se conectar com você.`,
    isRead: false,
    addedAt: now,
    updatedAt: now,
  });
}

export async function acceptConnectionRequest(currentUser: UserProfile, request: ConnectionEntry): Promise<void> {
  const db = getFirestore();
  const now = new Date();
  const ids = request.connectionId.split('_');

  await updateDoc(doc(db, 'connections', request.connectionId), {
    connectionId: request.connectionId,
    userAId: ids[0] || request.userId,
    userBId: ids[1] || request.connectedUserId,
    userIds: ids.length === 2 ? ids : [request.userId, request.connectedUserId],
    requestedBy: request.requestedBy,
    respondedBy: currentUser.userId,
    status: 'active',
    updatedAt: now,
  });

  await setDoc(doc(db, 'userConnections', `${currentUser.userId}_${request.connectionId}`), {
    ...request,
    status: 'connected',
    notificationType: '',
    notificationMessage: '',
    isRead: true,
    updatedAt: now,
  }, { merge: true });

  await setDoc(doc(db, 'userConnections', `${request.connectedUserId}_${request.connectionId}`), {
    userId: request.connectedUserId,
    connectionId: request.connectionId,
    connectedUserId: currentUser.userId,
    connectedUserName: currentUser.displayName,
    connectedUserEmail: currentUser.email,
    requestedBy: request.requestedBy,
    status: 'connected',
    notificationType: 'accepted',
    notificationMessage: `${currentUser.displayName} aceitou sua conexão.`,
    isRead: false,
    addedAt: request.addedAt ? toDate(request.addedAt) : now,
    updatedAt: now,
  });
}

export async function declineConnectionRequest(currentUser: UserProfile, request: ConnectionEntry): Promise<void> {
  const db = getFirestore();
  const now = new Date();

  await updateDoc(doc(db, 'connections', request.connectionId), {
    respondedBy: currentUser.userId,
    status: 'declined',
    updatedAt: now,
  });

  await deleteDoc(doc(db, 'userConnections', `${currentUser.userId}_${request.connectionId}`));
  await deleteDoc(doc(db, 'userConnections', `${request.connectedUserId}_${request.connectionId}`));
}

export async function markConnectionAsRead(userId: string, request: ConnectionEntry): Promise<void> {
  const db = getFirestore();
  await setDoc(doc(db, 'userConnections', `${userId}_${request.connectionId}`), {
    ...request,
    isRead: true,
    notificationType: '',
    notificationMessage: '',
    updatedAt: new Date(),
  }, { merge: true });
}

export function buildConnectionStatusLabel(entry: ConnectionEntry): string {
  return entry.status === 'pendingIncoming'
    ? 'Pendente de resposta'
    : entry.status === 'pendingOutgoing'
      ? 'Convite enviado'
      : entry.status === 'connected'
        ? 'Conectado'
        : entry.status;
}
