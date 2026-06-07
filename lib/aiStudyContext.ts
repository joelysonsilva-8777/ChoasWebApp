import {
  buildTeamBalanceLabel,
  buildTeamLeadershipLabel,
  buildTeamProfessorFocusLabel,
  getFacultyTeamMembers,
  getStudentTeamMembers,
  type TeamWorkspace,
} from './teamWorkspaceService';
import type { UserProfile } from './userProfileService';

export interface AiStudyContextSummary {
  displayName: string;
  role: string;
  projectCount: number;
  projectNames: string[];
  promptContext: string;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'sem prazo';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR');
}

function countTaskCards(team: TeamWorkspace): number {
  return team.taskColumns.reduce((sum, column) => sum + column.cards.length, 0);
}

function buildProfileLine(profile: UserProfile | null, displayName: string): string {
  if (!profile) {
    return `Usuário: ${displayName || 'usuário autenticado'} | perfil: estudante`;
  }

  const role = profile.role || 'student';
  const profileParts = [
    `Usuario: ${profile.displayName || displayName || 'usuario autenticado'}`,
    `perfil: ${role}`,
  ];

  if (role === 'company') {
    profileParts.push(`empresa: ${profile.companyName || profile.companyLegalName || 'não informada'}`);
    profileParts.push(`segmento: ${profile.companySegment || 'não informado'}`);
  } else {
    profileParts.push(`curso: ${profile.course || 'não informado'}`);
    profileParts.push(`foco acadêmico: ${profile.academicFocus || profile.academicDepartment || 'não informado'}`);
  }

  return profileParts.join(' | ');
}

function buildProjectLine(team: TeamWorkspace, index: number): string {
  const studentMembers = getStudentTeamMembers(team);
  const facultyMembers = getFacultyTeamMembers(team);
  const professorLabel = buildTeamProfessorFocusLabel(team);
  const leadershipLabel = buildTeamLeadershipLabel(team);
  const balanceLabel = buildTeamBalanceLabel(team);
  const notes = compactText(team.teacherNotes || team.csdBoard.doubts.slice(0, 2).join('; '), 160);
  const ucs = team.ucs.slice(0, 4).join(', ') || 'não informadas';

  return [
    `${index + 1}. ${team.teamName}`,
    `curso: ${team.course || 'não informado'}`,
    `turma: ${team.className || 'não informada'}`,
    `status: ${team.projectStatus || 'não informado'}`,
    `progresso: ${team.projectProgress}%`,
    `prazo: ${formatDate(team.projectDeadline)}`,
    `ucs: ${ucs}`,
    `pessoas: ${studentMembers.length} alunos e ${facultyMembers.length} docentes`,
    `marcos: ${team.milestones.length}`,
    `cards: ${countTaskCards(team)}`,
    `arquivos: ${team.assets.length}`,
    professorLabel,
    leadershipLabel,
    balanceLabel,
    notes ? `observacoes: ${notes}` : '',
  ].filter(Boolean).join(' | ');
}

export function buildAiStudyContextSummary(
  profile: UserProfile | null,
  displayName: string,
  projects: TeamWorkspace[],
): AiStudyContextSummary {
  const role = profile?.role || 'student';
  const normalizedDisplayName = profile?.displayName || displayName || 'Usuario';
  const sortedProjects = [...projects].sort((left, right) => {
    const leftDate = new Date(left.updatedAt || left.createdAt).getTime();
    const rightDate = new Date(right.updatedAt || right.createdAt).getTime();
    return rightDate - leftDate;
  });

  const visibleProjects = sortedProjects.slice(0, 8);
  const hiddenCount = Math.max(0, sortedProjects.length - visibleProjects.length);
  const projectLines = visibleProjects.map(buildProjectLine);
  const profileLine = buildProfileLine(profile, normalizedDisplayName);
  const companyContext = role === 'company'
    ? compactText(asText(profile?.companyDescription || profile?.professionalSummary), 240)
    : compactText(asText(profile?.bio || profile?.professionalSummary), 240);

  const contextLines = [
    profileLine,
    companyContext ? `Resumo do perfil: ${companyContext}` : '',
    'Funcionalidades do Choas: visao geral, chats com anexos e figurinhas, conexoes, equipes, projetos, docencia, calendario, arquivos, perfil e configuracoes.',
    `Projetos/equipes visiveis para este usuario: ${sortedProjects.length}.`,
    projectLines.length > 0 ? projectLines.join('\n') : 'Nenhum projeto/equipe foi carregado para este usuario ainda.',
    hiddenCount > 0 ? `Ha mais ${hiddenCount} projeto(s) alem dos listados. Prefira falar dos listados e peca o nome do projeto se precisar de mais contexto.` : '',
  ].filter(Boolean);

  return {
    displayName: normalizedDisplayName,
    role,
    projectCount: sortedProjects.length,
    projectNames: sortedProjects.map((project) => project.teamName).filter(Boolean),
    promptContext: contextLines.join('\n'),
  };
}
