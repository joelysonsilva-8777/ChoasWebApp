import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore';
import { AvatarComponents, DEFAULT_AVATAR, normalizeAvatar } from './avatarService';
import { getUserProfileService } from './userProfileService';

export type TeamBoardView = 'trello' | 'kanban' | 'csd';

export interface TeamWorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar: AvatarComponents;
  profilePhotoSource: string;
  isFaculty: boolean;
}

export interface TeamTaskCard {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: string;
  dueDate?: string;
  estimatedHours: number;
  workloadPoints: number;
  requiredRole: string;
  requiresProfessorReview: boolean;
  assignedUserIds: string[];
  mentionedUserIds: string[];
}

export interface TeamTaskColumn {
  id: string;
  title: string;
  accentColor: string;
  cards: TeamTaskCard[];
}

export interface TeamMilestone {
  id: string;
  title: string;
  notes: string;
  status: string;
  dueDate?: string;
  createdByUserId: string;
  ownerUserId: string;
  requiresProfessorReview: boolean;
  mentionedUserIds: string[];
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string;
}

export interface TeamAsset {
  assetId: string;
  category: string;
  fileName: string;
  previewImageDataUri: string;
  description: string;
  mimeType: string;
  folderPath: string;
  permissionScope: string;
  storageKind: string;
  storageReference: string;
  sizeBytes: number;
  version: number;
  addedByUserId: string;
  addedAt: string;
  lastSyncedAt?: string;
}

export interface TeamTimelineItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  ownerUserId: string;
  startsAt?: string;
  endsAt?: string;
}

export interface TeamNotification {
  id: string;
  message: string;
  type: string;
  audience: string;
  relatedEntityId: string;
  createdAt: string;
}

export interface TeamCsdBoard {
  certainties: string[];
  assumptions: string[];
  doubts: string[];
}

export interface TeamWorkspace {
  teamId: string;
  teamName: string;
  course: string;
  className: string;
  classId: string;
  academicTerm: string;
  templateId: string;
  templateName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRealtimeSyncAt?: string;
  projectProgress: number;
  projectDeadline?: string;
  projectStatus: string;
  teacherNotes: string;
  focalProfessorUserId: string;
  focalProfessorName: string;
  professorSupervisorUserIds: string[];
  professorSupervisorNames: string[];
  defaultFilePermissionScope: string;
  members: TeamWorkspaceMember[];
  facultyMembers: TeamWorkspaceMember[];
  ucs: string[];
  semesterTimeline: TeamTimelineItem[];
  milestones: TeamMilestone[];
  assets: TeamAsset[];
  taskColumns: TeamTaskColumn[];
  notifications: TeamNotification[];
  csdBoard: TeamCsdBoard;
  logoPreviewImageDataUri: string;
}

const DEFAULT_CSD_BOARD: TeamCsdBoard = {
  certainties: [],
  assumptions: [],
  doubts: [],
};

const DEFAULT_TEAM: TeamWorkspace = {
  teamId: '',
  teamName: '',
  course: '',
  className: '',
  classId: '',
  academicTerm: '',
  templateId: '',
  templateName: '',
  createdBy: '',
  createdAt: '',
  updatedAt: '',
  projectProgress: 0,
  projectStatus: 'Planejamento',
  teacherNotes: '',
  focalProfessorUserId: '',
  focalProfessorName: '',
  professorSupervisorUserIds: [],
  professorSupervisorNames: [],
  defaultFilePermissionScope: 'team',
  members: [],
  facultyMembers: [],
  ucs: [],
  semesterTimeline: [],
  milestones: [],
  assets: [],
  taskColumns: [],
  notifications: [],
  csdBoard: DEFAULT_CSD_BOARD,
  logoPreviewImageDataUri: '',
};

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

function isFacultyRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return (
    normalizedRole.includes('professor') ||
    normalizedRole.includes('docente') ||
    normalizedRole.includes('faculty') ||
    normalizedRole.includes('orientador') ||
    normalizedRole.includes('focal') ||
    normalizedRole.includes('supervisor') ||
    normalizedRole.includes('coordinator') ||
    normalizedRole.includes('coordenador') ||
    normalizedRole.includes('coordenação') ||
    normalizedRole.includes('coordenacao')
  );
}

function isLeaderRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return normalizedRole.includes('leader') || normalizedRole.includes('lider') || normalizedRole.includes('representante');
}

type LoadedProfile = Awaited<ReturnType<ReturnType<typeof getUserProfileService>['getUserProfile']>>;

function normalizeMemberRecord(rawMember: any, profile?: LoadedProfile): TeamWorkspaceMember {
  const role = asString(rawMember?.role, 'student');
  return {
    userId: asString(rawMember?.userId),
    name: profile?.displayName || asString(rawMember?.name) || 'Usuário',
    email: profile?.email || asString(rawMember?.email),
    role,
    avatar: profile?.avatar || normalizeAvatar(rawMember?.avatar || rawMember),
    profilePhotoSource: profile?.profilePhotoSource || profile?.profilePhoto || asString(rawMember?.profilePhotoSource || rawMember?.profilePhoto || rawMember?.photoURL),
    isFaculty: isFacultyRole(role),
  };
}

function dedupeMembers(members: TeamWorkspaceMember[]): TeamWorkspaceMember[] {
  const seenUserIds = new Set<string>();
  const seenNames = new Set<string>();

  return members
    .filter((member) => {
      const normalizedName = member.name.trim().toLowerCase();
      if (member.userId) {
        if (seenUserIds.has(member.userId)) {
          return false;
        }
        seenUserIds.add(member.userId);
      } else if (seenNames.has(normalizedName)) {
        return false;
      }

      seenNames.add(normalizedName);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

function normalizeColumns(value: unknown): TeamTaskColumn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((column: any, index: number) => ({
    id: asString(column?.id, `column-${index}`),
    title: asString(column?.title, 'Coluna'),
    accentColor: asString(column?.accentColor, index === 0 ? '#2563eb' : index === 1 ? '#0ea5e9' : '#8b5cf6'),
    cards: Array.isArray(column?.cards)
      ? column.cards.map((card: any, cardIndex: number) => ({
          id: asString(card?.id, `${column?.id || `column-${index}`}-card-${cardIndex}`),
          columnId: asString(card?.columnId, asString(column?.id, `column-${index}`)),
          title: asString(card?.title, 'Sem título'),
          description: asString(card?.description),
          priority: asString(card?.priority, 'Media'),
          dueDate: asDateString(card?.dueDate),
          estimatedHours: asNumber(card?.estimatedHours),
          workloadPoints: asNumber(card?.workloadPoints),
          requiredRole: asString(card?.requiredRole, 'student'),
          requiresProfessorReview: Boolean(card?.requiresProfessorReview),
          assignedUserIds: asStringArray(card?.assignedUserIds),
          mentionedUserIds: asStringArray(card?.mentionedUserIds),
        }))
      : [],
  }));
}

function normalizeMilestones(value: unknown): TeamMilestone[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((milestone: any, index: number) => ({
    id: asString(milestone?.id, `milestone-${index}`),
    title: asString(milestone?.title, 'Marco acadêmico'),
    notes: asString(milestone?.notes),
    status: asString(milestone?.status, 'Planejada'),
    dueDate: asDateString(milestone?.dueDate),
    createdByUserId: asString(milestone?.createdByUserId),
    ownerUserId: asString(milestone?.ownerUserId),
    requiresProfessorReview: Boolean(milestone?.requiresProfessorReview),
    mentionedUserIds: asStringArray(milestone?.mentionedUserIds),
    createdAt: asDateString(milestone?.createdAt) || new Date().toISOString(),
    updatedAt: asDateString(milestone?.updatedAt) || new Date().toISOString(),
    updatedByUserId: asString(milestone?.updatedByUserId),
  }));
}

function normalizeAssets(value: unknown): TeamAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((asset: any, index: number) => ({
    assetId: asString(asset?.assetId, `asset-${index}`),
    category: asString(asset?.category),
    fileName: asString(asset?.fileName),
    previewImageDataUri: asString(asset?.previewImageDataUri || asset?.previewImage),
    description: asString(asset?.description),
    mimeType: asString(asset?.mimeType),
    folderPath: asString(asset?.folderPath),
    permissionScope: asString(asset?.permissionScope, 'team'),
    storageKind: asString(asset?.storageKind, 'firebase-storage'),
    storageReference: asString(asset?.storageReference),
    sizeBytes: asNumber(asset?.sizeBytes),
    version: asNumber(asset?.version, 1),
    addedByUserId: asString(asset?.addedByUserId),
    addedAt: asDateString(asset?.addedAt) || new Date().toISOString(),
    lastSyncedAt: asDateString(asset?.lastSyncedAt),
  }));
}

function normalizeTimeline(value: unknown): TeamTimelineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item: any, index: number) => ({
    id: asString(item?.id, `timeline-${index}`),
    title: asString(item?.title, 'Etapa'),
    description: asString(item?.description),
    category: asString(item?.category),
    status: asString(item?.status, 'Planejado'),
    ownerUserId: asString(item?.ownerUserId),
    startsAt: asDateString(item?.startsAt),
    endsAt: asDateString(item?.endsAt),
  }));
}

function normalizeNotifications(value: unknown): TeamNotification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item: any, index: number) => ({
    id: asString(item?.id, `notification-${index}`),
    message: asString(item?.message),
    type: asString(item?.type, 'info'),
    audience: asString(item?.audience, 'team'),
    relatedEntityId: asString(item?.relatedEntityId),
    createdAt: asDateString(item?.createdAt) || new Date().toISOString(),
  }));
}

function normalizeTeamData(data: Record<string, unknown>, teamIdFallback: string): TeamWorkspace {
  return {
    ...DEFAULT_TEAM,
    teamId: asString(data.teamId, teamIdFallback),
    teamName: asString(data.teamName, 'Sem Nome'),
    course: asString(data.course, 'Não informado'),
    className: asString(data.className),
    classId: asString(data.classId),
    academicTerm: asString(data.academicTerm),
    templateId: asString(data.templateId),
    templateName: asString(data.templateName),
    createdBy: asString(data.createdBy),
    createdAt: asDateString(data.createdAt) || new Date().toISOString(),
    updatedAt: asDateString(data.updatedAt) || new Date().toISOString(),
    lastRealtimeSyncAt: asDateString(data.lastRealtimeSyncAt),
    projectProgress: asNumber(data.projectProgress),
    projectDeadline: asDateString(data.projectDeadline),
    projectStatus: asString(data.projectStatus, 'Planejamento'),
    teacherNotes: asString(data.teacherNotes),
    focalProfessorUserId: asString(data.focalProfessorUserId),
    focalProfessorName: asString(data.focalProfessorName),
    professorSupervisorUserIds: asStringArray(data.professorSupervisorUserIds || data.ProfessorSupervisorUserIds),
    professorSupervisorNames: asStringArray(data.professorSupervisorNames || data.ProfessorSupervisorNames),
    defaultFilePermissionScope: asString(data.defaultFilePermissionScope, 'team'),
    ucs: asStringArray(data.ucs),
    semesterTimeline: normalizeTimeline(data.semesterTimeline),
    milestones: normalizeMilestones(data.milestones),
    assets: normalizeAssets(data.assets),
    taskColumns: normalizeColumns(data.taskColumns),
    notifications: normalizeNotifications(data.notifications),
    csdBoard: {
      certainties: asStringArray((data.csdBoard as { certainties?: unknown } | undefined)?.certainties),
      assumptions: asStringArray((data.csdBoard as { assumptions?: unknown } | undefined)?.assumptions),
      doubts: asStringArray((data.csdBoard as { doubts?: unknown } | undefined)?.doubts),
    },
    logoPreviewImageDataUri: asString(data.logoPreviewImageDataUri || data.iconPreviewImageDataUri || data.teamLogoPreviewImageDataUri),
    members: [],
    facultyMembers: [],
  };
}

async function loadTeamDocumentByTeamId(teamId: string): Promise<Record<string, unknown> | null> {
  const db = getFirestore();

  try {
    const directDocument = await getDoc(doc(db, 'teams', teamId));
    if (directDocument.exists()) {
      return directDocument.data();
    }
  } catch {
    // Some roles can list team documents but cannot read them directly by id.
    // Fall back to the indexed query below so company views can still load.
  }

  const teamQuery = query(collection(db, 'teams'), where('teamId', '==', teamId));
  const teamSnapshot = await getDocs(teamQuery);
  if (teamSnapshot.empty) {
    return null;
  }

  return teamSnapshot.docs[0].data();
}

function collectProfileIds(rawMembers: any[], teamData: TeamWorkspace): string[] {
  const memberIds = rawMembers.map((member) => asString(member?.userId)).filter(Boolean);
  return Array.from(
    new Set([
      ...memberIds,
      teamData.focalProfessorUserId,
      ...teamData.professorSupervisorUserIds,
    ].filter(Boolean))
  );
}

function buildTeamMembers(rawMembers: any[], teamData: TeamWorkspace, profiles: Map<string, LoadedProfile>): { members: TeamWorkspaceMember[]; facultyMembers: TeamWorkspaceMember[] } {
  const normalizedMembers = rawMembers.map((member) => {
    const profile = member?.userId ? profiles.get(asString(member.userId)) : undefined;
    const normalizedRole = asString(member?.role, 'student');
    return {
      ...normalizeMemberRecord(member, profile),
      role: normalizedRole,
      isFaculty: isFacultyRole(normalizedRole),
    };
  });

  const studentMembers = normalizedMembers.filter((member) => !member.isFaculty);
  const facultyMap = new Map<string, TeamWorkspaceMember>();

  normalizedMembers
    .filter((member) => member.isFaculty)
    .forEach((member) => {
      facultyMap.set(member.userId || member.name.trim().toLowerCase(), member);
    });

  const addFacultyMember = (userId: string, fallbackName: string, roleLabel: string) => {
    const profile = userId ? profiles.get(userId) : undefined;
    const key = userId || fallbackName.trim().toLowerCase();
    if (facultyMap.has(key)) {
      return;
    }

    facultyMap.set(key, {
      userId,
      name: profile?.displayName || fallbackName || roleLabel,
      email: profile?.email || '',
      role: roleLabel,
      avatar: profile?.avatar || DEFAULT_AVATAR,
      profilePhotoSource: profile?.profilePhotoSource || profile?.profilePhoto || '',
      isFaculty: true,
    });
  };

  if (teamData.focalProfessorUserId || teamData.focalProfessorName) {
    addFacultyMember(teamData.focalProfessorUserId, teamData.focalProfessorName, 'professor focal');
  }

  teamData.professorSupervisorUserIds.forEach((userId, index) => {
    const fallbackName = teamData.professorSupervisorNames[index] || 'Orientador';
    addFacultyMember(userId, fallbackName, 'orientador');
  });

  teamData.professorSupervisorNames.forEach((name, index) => {
    if (!teamData.professorSupervisorUserIds[index]) {
      addFacultyMember('', name, 'orientador');
    }
  });

  return {
    members: dedupeMembers(studentMembers),
    facultyMembers: dedupeMembers([...facultyMap.values()]),
  };
}

export async function loadTeamWorkspaceByTeamId(teamId: string): Promise<TeamWorkspace | null> {
  const data = await loadTeamDocumentByTeamId(teamId);
  if (!data) {
    return null;
  }

  const rawMembers = Array.isArray(data.members) ? data.members : [];
  const normalized = normalizeTeamData(data, teamId);
  const profileService = getUserProfileService();
  const profileIds = collectProfileIds(rawMembers, normalized);
  const profiles = await profileService.getUsersByIds(profileIds);

  const teamMembers = buildTeamMembers(rawMembers, normalized, profiles);

  return {
    ...normalized,
    members: teamMembers.members,
    facultyMembers: teamMembers.facultyMembers,
  };
}

export async function loadUserTeamWorkspaces(userId: string): Promise<TeamWorkspace[]> {
  const db = getFirestore();
  const userTeamsRef = collection(db, 'userTeams');
  const snapshot = await getDocs(query(userTeamsRef, where('userId', '==', userId)));

  const teamIds = Array.from(new Set(snapshot.docs.map((document) => asString(document.data().teamId)).filter(Boolean)));
  const teams = await Promise.all(teamIds.map((teamId) => loadTeamWorkspaceByTeamId(teamId)));

  return teams.filter((team): team is TeamWorkspace => Boolean(team));
}

export async function loadAllTeamWorkspaces(): Promise<TeamWorkspace[]> {
  const db = getFirestore();
  const snapshot = await getDocs(collection(db, 'teams'));

  const teamIds = Array.from(
    new Set(
      snapshot.docs
        .map((document) => asString(document.data().teamId, document.id))
        .filter(Boolean),
    ),
  );

  const teams = await Promise.all(teamIds.map((teamId) => loadTeamWorkspaceByTeamId(teamId)));
  return teams.filter((team): team is TeamWorkspace => Boolean(team));
}

export function getStudentTeamMembers(team: Pick<TeamWorkspace, 'members'>): TeamWorkspaceMember[] {
  return [...team.members]
    .filter((member) => !member.isFaculty && !isFacultyRole(member.role))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export function getFacultyTeamMembers(team: Pick<TeamWorkspace, 'facultyMembers'>): TeamWorkspaceMember[] {
  return [...team.facultyMembers].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export function getStudentLeaders(team: Pick<TeamWorkspace, 'members'>): TeamWorkspaceMember[] {
  return getStudentTeamMembers(team).filter((member) => isLeaderRole(member.role));
}

export function buildTeamProfessorFocusLabel(team: TeamWorkspace): string {
  if (!team.focalProfessorName && team.facultyMembers.length === 0) {
    return 'Sem professor focal definido';
  }

  if (team.focalProfessorName) {
    return `Professor focal: ${team.focalProfessorName}`;
  }

  const supervisors = team.facultyMembers.slice(0, 2).map((member) => member.name).filter(Boolean);
  if (supervisors.length === 0) {
    return 'Sem professor focal definido';
  }

  return supervisors.length === 1
    ? `Docente vinculado: ${supervisors[0]}`
    : `Docentes vinculados: ${supervisors.join(', ')}`;
}

export function buildTeamLeadershipLabel(team: Pick<TeamWorkspace, 'members'>): string {
  const leaders = getStudentLeaders(team);
  if (leaders.length === 0) {
    return 'Sem líder discente definido';
  }

  return leaders.length === 1
    ? `Líder discente: ${leaders[0].name}`
    : `Liderança discente: ${leaders.slice(0, 2).map((member) => member.name).join(', ')}`;
}

export function buildTeamBalanceLabel(team: TeamWorkspace): string {
  const studentCount = getStudentTeamMembers(team).length;
  const facultyCount = getFacultyTeamMembers(team).length;
  return `${studentCount} aluno(s) em execução • ${facultyCount} docente(s) em orientação`;
}

export function getTeamLogoSource(team: TeamWorkspace): string {
  const logoAsset = team.assets.find((asset) => asset.category.toLowerCase() === 'logo' && asset.previewImageDataUri);
  return logoAsset?.previewImageDataUri || team.logoPreviewImageDataUri || '';
}

export function createDefaultBoardColumns(): TeamTaskColumn[] {
  return [
    { id: 'backlog', title: 'Backlog', accentColor: '#94a3b8', cards: [] },
    { id: 'doing', title: 'Em andamento', accentColor: '#0ea5e9', cards: [] },
    { id: 'review', title: 'Em revisão', accentColor: '#8b5cf6', cards: [] },
    { id: 'done', title: 'Concluído', accentColor: '#22c55e', cards: [] },
  ];
}
