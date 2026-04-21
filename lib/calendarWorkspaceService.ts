import { type UserProfile, type UserCalendarEntry } from './userProfileService';
import {
  buildTeamBalanceLabel,
  getTeamLogoSource,
  type TeamWorkspace,
} from './teamWorkspaceService';

export interface CalendarAgendaItem {
  id: string;
  teamId: string;
  teamName: string;
  teamLogoSource: string;
  kindLabel: string;
  contextLabel: string;
  title: string;
  subtitle: string;
  notes: string;
  statusLabel: string;
  dueDate: string;
  accentColor: string;
  isOverdue: boolean;
  canOpenTeam: boolean;
}

export interface CalendarAgendaFilters {
  teamId: string;
  kind: string;
  status: string;
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

function normalizeTeamText(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function toLower(value: string | undefined | null): string {
  return normalizeTeamText(value).toLowerCase();
}

function getDateDifferenceInDays(date: string): number {
  const target = new Date(date);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function buildStatusLabel(dueDate: string, requiresProfessorReview = false): string {
  const delta = getDateDifferenceInDays(dueDate);
  if (delta < 0) {
    return 'Em risco';
  }

  if (delta === 0) {
    return 'Hoje';
  }

  if (delta <= 7) {
    return 'Próximos 7 dias';
  }

  if (requiresProfessorReview) {
    return 'Com revisão';
  }

  return 'Planejado';
}

function getTeamAccentColor(kindLabel: string, isOverdue: boolean): string {
  if (isOverdue) {
    return '#dc2626';
  }

  return {
    'Prazo': '#f97316',
    'Marco': '#8b5cf6',
    'Tarefa': '#2563eb',
    'Atividade': '#0ea5e9',
    'Evento': '#10b981',
    'Reunião': '#6366f1',
    'Aviso': '#7c3aed',
    'Sem aula': '#dc2626',
  }[kindLabel] || '#2563eb';
}

function normalizeProfileCalendarEntryTypeWithMap(entryType: string): string {
  return toLower(entryType) === 'atividade'
    ? 'Atividade'
    : toLower(entryType) === 'prazo'
    ? 'Prazo'
    : toLower(entryType) === 'evento'
    ? 'Evento'
    : toLower(entryType) === 'reunião' || toLower(entryType) === 'reuniao'
    ? 'Reunião'
    : toLower(entryType) === 'sem aula'
    ? 'Sem aula'
    : 'Aviso';
}

function normalizeProfileCalendarEntryType(entryType: string): string {
  return normalizeProfileCalendarEntryTypeWithMap(entryType);
}

function normalizeProfileCalendarContextLabel(contextLabel: string): string {
  const normalized = toLower(contextLabel);
  if (normalized === 'coordenação' || normalized === 'coordenacao') {
    return 'Coordenação';
  }
  if (normalized === 'equipe') {
    return 'Equipe';
  }
  if (normalized === 'reunião' || normalized === 'reuniao') {
    return 'Reunião';
  }
  return 'Professor';
}

function buildCalendarContextLabel(title: string, notes: string, category: string, requiresProfessorReview: boolean, requiredRole = ''): string {
  const haystack = `${title} ${notes} ${category}`.toLowerCase();

  if (haystack.includes('reunião') || haystack.includes('reuniao') || haystack.includes('meeting') || haystack.includes('orientação') || haystack.includes('orientacao') || haystack.includes('daily') || haystack.includes('alinhamento') || haystack.includes('banca')) {
    return 'Reunião';
  }

  if (requiredRole.toLowerCase().includes('coordinator') || haystack.includes('coordenação') || haystack.includes('coordenacao') || haystack.includes('coordenador') || haystack.includes('coord')) {
    return 'Coordenação';
  }

  if (requiresProfessorReview || requiredRole.toLowerCase().includes('professor') || haystack.includes('professor') || haystack.includes('orientador') || haystack.includes('docente')) {
    return 'Professor';
  }

  return 'Equipe';
}

export function getCalendarMonthTitle(month: Date): string {
  const culture = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const formatted = culture.format(month);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function buildCalendarAgendaItems(
  teams: TeamWorkspace[],
  profile: UserProfile | null,
  profileCalendarEntries: UserCalendarEntry[] = []
): CalendarAgendaItem[] {
  const items: CalendarAgendaItem[] = [];
  const profileLogoSource = profile?.profilePhotoSource || profile?.profilePhotoDataUri || '';

  teams.forEach((team) => {
    const teamLogoSource = getTeamLogoSource(team);
    const baseSubtitle = [team.course, team.className].filter(Boolean).join(' • ') || 'Turma não informada';

    if (team.projectDeadline) {
      const title = team.projectStatus === 'Concluído' ? 'Projeto concluído' : 'Prazo do projeto';
      const notes = buildTeamBalanceLabel(team);
      const contextLabel = buildCalendarContextLabel(title, notes, 'Prazo', false);
      const accentColor = getTeamAccentColor('Prazo', getDateDifferenceInDays(team.projectDeadline) < 0);

      items.push({
        id: `${team.teamId}-deadline`,
        teamId: team.teamId,
        teamName: team.teamName,
        teamLogoSource,
        kindLabel: 'Prazo',
        contextLabel,
        title,
        subtitle: baseSubtitle,
        notes,
        statusLabel: buildStatusLabel(team.projectDeadline),
        dueDate: team.projectDeadline,
        accentColor,
        isOverdue: getDateDifferenceInDays(team.projectDeadline) < 0,
        canOpenTeam: true,
      });
    }

    team.milestones
      .filter((milestone) => Boolean(milestone.dueDate))
      .forEach((milestone) => {
        const dueDate = milestone.dueDate || team.updatedAt;
        const contextLabel = buildCalendarContextLabel(milestone.title, milestone.notes, 'Marco', milestone.requiresProfessorReview);

        items.push({
          id: `${team.teamId}-milestone-${milestone.id}`,
          teamId: team.teamId,
          teamName: team.teamName,
          teamLogoSource,
          kindLabel: 'Marco',
          contextLabel,
          title: normalizeTeamText(milestone.title) || 'Marco acadêmico',
          subtitle: baseSubtitle,
          notes: normalizeTeamText(milestone.notes) || milestone.status,
          statusLabel: buildStatusLabel(dueDate, milestone.requiresProfessorReview),
          dueDate,
          accentColor: getTeamAccentColor('Marco', getDateDifferenceInDays(dueDate) < 0),
          isOverdue: getDateDifferenceInDays(dueDate) < 0,
          canOpenTeam: true,
        });
      });

    team.taskColumns.forEach((column) => {
      column.cards
        .filter((card) => Boolean(card.dueDate))
        .forEach((card) => {
          const dueDate = card.dueDate || team.updatedAt;
          const kindLabel = card.requiresProfessorReview ? 'Atividade' : 'Tarefa';
          const contextLabel = buildCalendarContextLabel(card.title, card.description, kindLabel, card.requiresProfessorReview, card.requiredRole);

          items.push({
            id: `${team.teamId}-card-${card.id}`,
            teamId: team.teamId,
            teamName: team.teamName,
            teamLogoSource,
            kindLabel,
            contextLabel,
            title: normalizeTeamText(card.title) || 'Tarefa',
            subtitle: `${baseSubtitle} • ${column.title}`,
            notes: normalizeTeamText(card.description),
            statusLabel: buildStatusLabel(dueDate, card.requiresProfessorReview),
            dueDate,
            accentColor: getTeamAccentColor(kindLabel, getDateDifferenceInDays(dueDate) < 0),
            isOverdue: getDateDifferenceInDays(dueDate) < 0,
            canOpenTeam: true,
          });
        });
    });

    team.semesterTimeline
      .filter((item) => item.startsAt || item.endsAt)
      .forEach((item) => {
        const dueDate = item.endsAt || item.startsAt || team.updatedAt;
        const contextLabel = buildCalendarContextLabel(item.title, item.description, item.category, false);

        items.push({
          id: `${team.teamId}-timeline-${item.id}`,
          teamId: team.teamId,
          teamName: team.teamName,
          teamLogoSource,
          kindLabel: 'Evento',
          contextLabel,
          title: normalizeTeamText(item.title) || 'Evento',
          subtitle: baseSubtitle,
          notes: normalizeTeamText(item.description) || item.category,
          statusLabel: buildStatusLabel(dueDate),
          dueDate,
          accentColor: getTeamAccentColor('Evento', getDateDifferenceInDays(dueDate) < 0),
          isOverdue: getDateDifferenceInDays(dueDate) < 0,
          canOpenTeam: true,
        });
      });
  });

  if (profile && Array.isArray(profileCalendarEntries)) {
    profileCalendarEntries
      .filter((entry) => Boolean(entry.title))
      .forEach((entry) => {
        const kindLabel = normalizeProfileCalendarEntryTypeWithMap(entry.entryType);
        const contextLabel = normalizeProfileCalendarContextLabel(entry.contextLabel);
        const dueDate = asDateString(entry.date) || new Date().toISOString();

        items.push({
          id: `profile:${profile.userId}:${entry.entryId}`,
          teamId: `profile:${profile.userId}`,
          teamName: 'Calendário docente',
          teamLogoSource: profileLogoSource,
          kindLabel,
          contextLabel,
          title: normalizeTeamText(entry.title) || kindLabel,
          subtitle: `${contextLabel} • Calendário independente`,
          notes: normalizeTeamText(entry.notes),
          statusLabel: buildStatusLabel(dueDate, kindLabel === 'Atividade' || kindLabel === 'Prazo'),
          dueDate,
          accentColor: getTeamAccentColor(kindLabel, getDateDifferenceInDays(dueDate) < 0),
          isOverdue: getDateDifferenceInDays(dueDate) < 0,
          canOpenTeam: false,
        });
      });
  }

  return items
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .map((item) => ({
      ...item,
      statusLabel: item.statusLabel || buildStatusLabel(item.dueDate),
    }));
}

export function filterCalendarAgendaItems(items: CalendarAgendaItem[], filters: CalendarAgendaFilters): CalendarAgendaItem[] {
  return items.filter((item) => {
    const matchesTeam = !filters.teamId || item.teamId === filters.teamId;
    const matchesKind = !filters.kind || filters.kind === 'Todos' || item.kindLabel === filters.kind;
    const matchesStatus = !filters.status || filters.status === 'Todos' || item.statusLabel === filters.status;
    return matchesTeam && matchesKind && matchesStatus;
  });
}

export function groupCalendarAgendaItemsByDate(items: CalendarAgendaItem[]): Array<[string, CalendarAgendaItem[]]> {
  const buckets = new Map<string, CalendarAgendaItem[]>();

  items.forEach((item) => {
    const key = new Date(item.dueDate).toLocaleDateString('pt-BR');
    const currentItems = buckets.get(key) || [];
    currentItems.push(item);
    buckets.set(key, currentItems);
  });

  return Array.from(buckets.entries());
}

export function getCalendarDaySummaryText(dayItems: CalendarAgendaItem[]): string {
  if (dayItems.length === 0) {
    return '';
  }

  const firstTitle = dayItems[0].title;
  return dayItems.length === 1 ? firstTitle : `${firstTitle} +${dayItems.length - 1}`;
}

export function getCalendarStatusOptions(): string[] {
  return ['Todos', 'Em risco', 'Hoje', 'Próximos 7 dias', 'Com revisão', 'Planejado'];
}

export function getCalendarKindOptions(): string[] {
  return ['Todos', 'Aviso', 'Atividade', 'Prazo', 'Marco', 'Tarefa', 'Evento', 'Reunião', 'Sem aula'];
}
