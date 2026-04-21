import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore';

export interface TeachingClassMemberSummary {
  userId: string;
  name: string;
  email: string;
  registration: string;
  role: string;
  joinedAt: string;
}

export interface TeachingClassInfo {
  classId: string;
  className: string;
  course: string;
  academicTerm: string;
  description: string;
  iconPreviewImageDataUri: string;
  iconStorageReference: string;
  iconFileName: string;
  iconMimeType: string;
  iconVersion: number;
  iconUpdatedAt?: string;
  joinCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  professorUserIds: string[];
  professorNames: string[];
  representativeUserId: string;
  representativeName: string;
  viceRepresentativeUserId: string;
  viceRepresentativeName: string;
  studentIds: string[];
  studentSummaries: TeachingClassMemberSummary[];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asDateString(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return undefined;
}

function parseStudentSummary(value: unknown): TeachingClassMemberSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((member: any, index: number) => ({
    userId: asString(member?.userId),
    name: asString(member?.name, 'Usuário'),
    email: asString(member?.email),
    registration: asString(member?.registration),
    role: asString(member?.role, 'student'),
    joinedAt: asDateString(member?.joinedAt) || new Date().toISOString(),
  })).filter((member, index, list) => {
    if (!member.userId) {
      return index === list.findIndex((item) => item.name === member.name && item.registration === member.registration);
    }

    return index === list.findIndex((item) => item.userId === member.userId);
  });
}

function parseTeachingClass(data: Record<string, unknown>, fallbackClassId: string): TeachingClassInfo {
  return {
    classId: asString(data.classId, fallbackClassId),
    className: asString(data.className, 'Turma sem nome'),
    course: asString(data.course, 'Curso não informado'),
    academicTerm: asString(data.academicTerm, 'Sem período'),
    description: asString(data.description),
    iconPreviewImageDataUri: asString(data.iconPreviewImageDataUri || data.iconPreviewImage || data.logoPreviewImageDataUri),
    iconStorageReference: asString(data.iconStorageReference || data.iconStoragePath),
    iconFileName: asString(data.iconFileName),
    iconMimeType: asString(data.iconMimeType),
    iconVersion: asNumber(data.iconVersion, 1),
    iconUpdatedAt: asDateString(data.iconUpdatedAt),
    joinCode: asString(data.joinCode),
    createdBy: asString(data.createdBy),
    createdAt: asDateString(data.createdAt) || new Date().toISOString(),
    updatedAt: asDateString(data.updatedAt) || new Date().toISOString(),
    professorUserIds: asStringArray(data.professorUserIds),
    professorNames: asStringArray(data.professorNames),
    representativeUserId: asString(data.representativeUserId),
    representativeName: asString(data.representativeName),
    viceRepresentativeUserId: asString(data.viceRepresentativeUserId),
    viceRepresentativeName: asString(data.viceRepresentativeName),
    studentIds: asStringArray(data.studentIds),
    studentSummaries: parseStudentSummary(data.studentSummaries),
  };
}

async function loadTeachingClassDocumentById(classId: string): Promise<Record<string, unknown> | null> {
  const db = getFirestore();
  const directDocument = await getDoc(doc(db, 'teachingClasses', classId));
  if (directDocument.exists()) {
    return directDocument.data();
  }

  const fallbackQuery = query(collection(db, 'teachingClasses'), where('classId', '==', classId));
  const snapshot = await getDocs(fallbackQuery);
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
}

async function loadUserTeachingClassIds(userId: string): Promise<string[]> {
  const db = getFirestore();
  const ids = new Set<string>();

  const enrollmentSnapshot = await getDocs(query(
    collection(db, 'userClassEnrollments'),
    where('userId', '==', userId)
  ));

  enrollmentSnapshot.docs.forEach((document) => {
    const classId = asString(document.data().classId);
    if (classId) {
      ids.add(classId);
    }
  });

  const createdSnapshot = await getDocs(query(
    collection(db, 'teachingClasses'),
    where('createdBy', '==', userId)
  ));

  createdSnapshot.docs.forEach((document) => {
    const classId = asString(document.data().classId, document.id);
    if (classId) {
      ids.add(classId);
    }
  });

  return Array.from(ids);
}

export async function loadTeachingClassById(classId: string): Promise<TeachingClassInfo | null> {
  const normalizedClassId = asString(classId).trim();
  if (!normalizedClassId) {
    return null;
  }

  const data = await loadTeachingClassDocumentById(normalizedClassId);
  return data ? parseTeachingClass(data, normalizedClassId) : null;
}

export async function loadUserTeachingClasses(userId: string): Promise<TeachingClassInfo[]> {
  if (!userId) {
    return [];
  }

  const classIds = await loadUserTeachingClassIds(userId);
  const loadedClasses = await Promise.all(classIds.map((classId) => loadTeachingClassById(classId)));

  return loadedClasses
    .filter((item): item is TeachingClassInfo => Boolean(item))
    .sort((left, right) => {
      const courseComparison = left.course.localeCompare(right.course, 'pt-BR');
      return courseComparison !== 0 ? courseComparison : left.className.localeCompare(right.className, 'pt-BR');
    });
}

export function getTeachingClassLogoSource(teachingClass: TeachingClassInfo): string {
  return teachingClass.iconPreviewImageDataUri || '';
}

export function getTeachingClassStudentCount(teachingClass: TeachingClassInfo): number {
  return teachingClass.studentIds.length > 0 ? teachingClass.studentIds.length : teachingClass.studentSummaries.length;
}

export function getTeachingClassProfessorCount(teachingClass: TeachingClassInfo): number {
  return teachingClass.professorNames.length > 0 ? teachingClass.professorNames.length : teachingClass.professorUserIds.length;
}

export function buildTeachingClassBalanceLabel(teachingClass: TeachingClassInfo): string {
  return `${getTeachingClassStudentCount(teachingClass)} aluno(s) • ${getTeachingClassProfessorCount(teachingClass)} docente(s)`;
}

export function buildTeachingClassSearchText(teachingClass: TeachingClassInfo): string {
  return [
    teachingClass.className,
    teachingClass.course,
    teachingClass.academicTerm,
    teachingClass.joinCode,
    teachingClass.representativeName,
    teachingClass.viceRepresentativeName,
    ...teachingClass.professorNames,
    ...teachingClass.studentSummaries.map((student) => `${student.name} ${student.registration}`),
  ]
    .join(' ')
    .toLowerCase();
}
