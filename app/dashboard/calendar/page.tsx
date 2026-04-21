'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useAuth } from '../../../lib/useAuth';
import { getUserProfileService, type UserProfile } from '../../../lib/userProfileService';
import { loadUserTeamWorkspaces, type TeamWorkspace } from '../../../lib/teamWorkspaceService';
import {
  buildCalendarAgendaItems,
  filterCalendarAgendaItems,
  getCalendarDaySummaryText,
  getCalendarKindOptions,
  getCalendarMonthTitle,
  getCalendarStatusOptions,
  groupCalendarAgendaItemsByDate,
  type CalendarAgendaFilters,
  type CalendarAgendaItem,
} from '../../../lib/calendarWorkspaceService';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  RefreshCw,
  Sparkles,
  Users,
  ListTodo,
  Target,
} from 'lucide-react';

interface CalendarStats {
  totalItems: number;
  upcomingItems: number;
  overdueItems: number;
  profileEntries: number;
}

interface MonthCell {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  items: CalendarAgendaItem[];
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function CalendarPage() {
  const user = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teams, setTeams] = useState<TeamWorkspace[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [filters, setFilters] = useState<CalendarAgendaFilters>({
    teamId: '',
    kind: 'Todos',
    status: 'Todos',
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const profileService = getUserProfileService();
        const [loadedProfile, loadedTeams] = await Promise.all([
          profileService.getUserProfile(user.uid),
          loadUserTeamWorkspaces(user.uid),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(loadedProfile);
        setTeams(loadedTeams);

        const initialItems = buildCalendarAgendaItems(loadedTeams, loadedProfile, loadedProfile?.calendarEntries || []);
        const firstVisibleDate = initialItems[0]?.dueDate ? new Date(initialItems[0].dueDate) : new Date();
        setSelectedMonth(firstVisibleDate);
        setSelectedDateKey(toDateKey(firstVisibleDate));
      } catch (error) {
        console.error('Erro ao carregar calendário:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const calendarItems = useMemo(() => {
    return buildCalendarAgendaItems(teams, profile, profile?.calendarEntries || []);
  }, [teams, profile]);

  const filteredItems = useMemo(() => {
    return filterCalendarAgendaItems(calendarItems, filters);
  }, [calendarItems, filters]);

  const monthItems = useMemo(() => {
    return filteredItems.filter((item) => isSameMonth(item.dueDate, selectedMonth));
  }, [filteredItems, selectedMonth]);

  const groupedMonthItems = useMemo(() => {
    return groupCalendarAgendaItemsByDate(monthItems);
  }, [monthItems]);

  const selectedDayItems = useMemo(() => {
    return monthItems.filter((item) => toDateKey(item.dueDate) === selectedDateKey);
  }, [monthItems, selectedDateKey]);

  const monthCells = useMemo(() => {
    return buildMonthGrid(selectedMonth, monthItems, selectedDateKey);
  }, [monthItems, selectedDateKey, selectedMonth]);

  const stats: CalendarStats = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const upcomingItems = filteredItems.filter((item) => new Date(item.dueDate).getTime() >= today).length;
    const overdueItems = filteredItems.filter((item) => item.isOverdue).length;
    const profileEntries = profile?.calendarEntries?.length || 0;

    return {
      totalItems: filteredItems.length,
      upcomingItems,
      overdueItems,
      profileEntries,
    };
  }, [filteredItems, profile]);

  useEffect(() => {
    if (monthItems.length === 0) {
      return;
    }

    const selectedInMonth = monthItems.some((item) => toDateKey(item.dueDate) === selectedDateKey);
    if (!selectedInMonth) {
      setSelectedDateKey(toDateKey(new Date(monthItems[0].dueDate)));
    }
  }, [monthItems, selectedDateKey]);

  const teamOptions = useMemo(() => {
    const seen = new Map<string, string>();
    filteredItems.forEach((item) => {
      if (item.teamId && !seen.has(item.teamId)) {
        seen.set(item.teamId, item.teamName);
      }
    });
    return Array.from(seen.entries()).map(([teamId, teamName]) => ({ teamId, teamName }));
  }, [filteredItems]);

  const selectedDayLabel = selectedDayItems[0]?.dueDate ? new Date(selectedDayItems[0].dueDate).toLocaleDateString('pt-BR') : '';

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const profileService = getUserProfileService();
    void Promise.all([profileService.getUserProfile(user.uid), loadUserTeamWorkspaces(user.uid)])
      .then(([loadedProfile, loadedTeams]) => {
        setProfile(loadedProfile);
        setTeams(loadedTeams);
        const freshItems = buildCalendarAgendaItems(loadedTeams, loadedProfile, loadedProfile?.calendarEntries || []);
        const firstVisibleDate = freshItems[0]?.dueDate ? new Date(freshItems[0].dueDate) : new Date();
        setSelectedMonth(firstVisibleDate);
        setSelectedDateKey(toDateKey(firstVisibleDate));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100 sm:mb-4 sm:text-xs">
                <Sparkles size={14} />
                Calendário acadêmico
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">Agenda estruturada em mês, filtros e itens do perfil</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/90 sm:text-[15px]">
                A visão combina prazos das equipes com compromissos do perfil docente, igual ao fluxo do desktop: mês navegável, filtros por tipo e status, e detalhes do dia selecionado.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <SummaryCard icon={CalendarDays} label="Itens" value={stats.totalItems} />
              <SummaryCard icon={Clock3} label="Futuros" value={stats.upcomingItems} />
              <SummaryCard icon={AlertTriangle} label="Em risco" value={stats.overdueItems} />
              <SummaryCard icon={Users} label="Perfil" value={stats.profileEntries} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Filtros do calendário</h3>
            <p className="mt-1 text-sm text-slate-500">A visão do desktop cruza equipe, tipo e status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Atualizando...' : 'Atualizar agenda'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SelectField
            label="Equipe"
            value={filters.teamId}
            onChange={(value) => setFilters((previous) => ({ ...previous, teamId: value }))}
            options={[{ value: '', label: 'Todas as equipes' }, ...teamOptions.map((team) => ({ value: team.teamId, label: team.teamName }))]}
          />
          <SelectField
            label="Tipo"
            value={filters.kind}
            onChange={(value) => setFilters((previous) => ({ ...previous, kind: value }))}
            options={getCalendarKindOptions().map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Status"
            value={filters.status}
            onChange={(value) => setFilters((previous) => ({ ...previous, status: value }))}
            options={getCalendarStatusOptions().map((value) => ({ value, label: value }))}
          />
        </div>
      </section>

      {filteredItems.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <CalendarDays size={48} className="mx-auto mb-4 text-slate-400" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Nenhum compromisso disponível</h4>
          <p className="text-slate-600">Ajuste os filtros para ver o calendário consolidado do desktop.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_380px]">
          <div className="space-y-4 sm:space-y-6">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">{getCalendarMonthTitle(selectedMonth)}</h3>
                  <p className="mt-1 text-sm text-slate-500">Navegação mensal com a mesma lógica de leitura do desktop.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-700 transition hover:bg-slate-50"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(new Date())}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-700 transition hover:bg-slate-50"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto pb-1">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-2">
                    {label}
                  </div>
                ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-2">
                {monthCells.map((cell) => (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedDateKey(cell.key)}
                    className={`min-h-24 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-28 sm:rounded-3xl sm:p-3 ${
                      cell.isCurrentMonth ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-50/70 text-slate-400'
                    } ${cell.isSelected ? 'ring-2 ring-blue-200 border-blue-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold sm:text-sm ${cell.isToday ? 'text-blue-700' : 'text-slate-900'}`}>{cell.date.getDate()}</span>
                      {cell.items.length > 0 ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">{cell.items.length}</span>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] font-semibold text-slate-700 sm:text-xs">{getCalendarDaySummaryText(cell.items)}</p>
                      {cell.items[0] ? (
                        <p className="text-[10px] text-slate-500 sm:text-[11px]">{cell.items[0].kindLabel} • {cell.items[0].statusLabel}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 sm:text-[11px]">Sem itens</p>
                      )}
                    </div>
                  </button>
                ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Agenda do mês</h3>
                  <p className="mt-1 text-sm text-slate-500">Eventos agrupados por data, como na lista de resumo do aplicativo desktop.</p>
                </div>
                <ListTodo className="text-slate-400" size={20} />
              </div>

              <div className="mt-5 space-y-5">
                {groupedMonthItems.map(([dateLabel, items]) => (
                  <div key={dateLabel} className="space-y-3">
                    <div className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                      {dateLabel}
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => (
                        <article
                          key={item.id}
                          className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white sm:gap-4 sm:rounded-3xl"
                        >
                          <div
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white shadow-sm sm:h-14 sm:w-14"
                            style={{ backgroundColor: item.accentColor }}
                          >
                            {item.teamLogoSource ? (
                              <img src={item.teamLogoSource} alt={item.teamName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-black">{item.teamName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.teamName}</p>
                                <h4 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">{item.title}</h4>
                              </div>
                              <StatusBadge label={item.statusLabel} overdue={item.isOverdue} />
                            </div>

                            <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p>
                            <p className="mt-2 text-sm text-slate-500">{item.notes || item.contextLabel}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{item.kindLabel}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{item.contextLabel}</span>
                              {item.canOpenTeam ? (
                                <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">Abrir equipe</span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Perfil docente</span>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Dia selecionado</h3>
              <p className="mt-1 text-sm text-slate-500">{selectedDayLabel || 'Selecione uma data no mês'}</p>
            </div>

            {selectedDayItems.length > 0 ? (
              <div className="space-y-3">
                {selectedDayItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.teamName}</p>
                        <h4 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h4>
                      </div>
                      <StatusBadge label={item.statusLabel} overdue={item.isOverdue} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.notes || item.contextLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600">{item.kindLabel}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600">{item.contextLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <CalendarDays size={44} className="mx-auto mb-4 text-slate-400" />
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Nenhum item neste dia</h4>
                <p className="text-sm text-slate-600">Clique em outro dia do mês para ver os compromissos detalhados.</p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Resumo do dia</h4>
                <Target size={16} className="text-slate-400" />
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Itens no dia: <span className="font-semibold text-slate-900">{selectedDayItems.length}</span></p>
                <p>Mês carregado: <span className="font-semibold text-slate-900">{getCalendarMonthTitle(selectedMonth)}</span></p>
                <p>Equipe / perfil: <span className="font-semibold text-slate-900">{filteredItems.length}</span></p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
              <h4 className="text-sm font-semibold text-slate-700">Equipes na agenda</h4>
              <div className="mt-3 space-y-2">
                {teamOptions.slice(0, 6).map((team) => {
                  const count = filteredItems.filter((item) => item.teamId === team.teamId).length;
                  return (
                    <div key={team.teamId} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{team.teamName}</p>
                      <p className="text-xs text-slate-500">{count} item(ns) no filtro atual</p>
                    </div>
                  );
                })}
                {profile?.displayName ? (
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{profile.displayName}</p>
                    <p className="text-xs text-slate-500">{profile.calendarEntries?.length || 0} entrada(s) pessoais</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
              <h4 className="text-sm font-semibold text-slate-700">Avisos da coordenação</h4>
              <div className="mt-3 space-y-2">
                {profile?.calendarEntries && profile.calendarEntries.length > 0 ? (
                  profile.calendarEntries
                    .slice()
                    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
                    .slice(0, 6)
                    .map((entry) => (
                      <div key={entry.entryId} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{entry.contextLabel || 'Coordenação'}</p>
                            <p className="mt-1 font-semibold text-slate-900">{entry.title}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{entry.entryType || 'Aviso'}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{entry.notes || 'Sem observações adicionais.'}</p>
                        <p className="mt-2 text-[11px] text-slate-400">{new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                    Nenhum aviso de coordenação foi carregado neste perfil.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <Icon size={18} className="text-blue-100/90" />
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Filter size={14} />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ label, overdue }: { label: string; overdue: boolean }) {
  const classes = overdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function startOfDay(value: Date): Date {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameMonth(dateValue: string, month: Date): boolean {
  const date = new Date(dateValue);
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
}

function buildMonthGrid(month: Date, items: CalendarAgendaItem[], selectedDateKey: string): MonthCell[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - offset);

  const cells: MonthCell[] = [];
  const todayKey = toDateKey(new Date());

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = toDateKey(date);
    const dayItems = items.filter((item) => toDateKey(item.dueDate) === key);

    cells.push({
      key,
      date,
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: key === todayKey,
      isSelected: key === selectedDateKey,
      items: dayItems,
    });
  }

  return cells;
}
