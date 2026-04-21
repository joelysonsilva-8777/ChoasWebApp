'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useAuth } from '../../../lib/useAuth';
import AvatarDisplay from '../../../components/AvatarDisplay';
import { DEFAULT_AVATAR, type AvatarComponents } from '../../../lib/avatarService';
import { getUserProfileService, type UserProfile } from '../../../lib/userProfileService';
import {
  buildTeachingClassBalanceLabel,
  buildTeachingClassSearchText,
  getTeachingClassLogoSource,
  getTeachingClassProfessorCount,
  getTeachingClassStudentCount,
  loadUserTeachingClasses,
  type TeachingClassInfo,
} from '../../../lib/teachingClassWorkspaceService';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Copy,
  GraduationCap,
  Layers3,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

interface TeachingStats {
  totalTurmas: number;
  turmasComImagem: number;
  totalDiscentes: number;
  totalDocentes: number;
  mediaDiscentes: number;
}

export default function TeachingPage() {
  const user = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<TeachingClassInfo[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [profileAvatar] = useState<AvatarComponents>(DEFAULT_AVATAR);

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
        const [profile, teachingClasses] = await Promise.all([
          profileService.getUserProfile(user.uid),
          loadUserTeachingClasses(user.uid),
        ]);

        if (cancelled) {
          return;
        }

        setCurrentProfile(profile);
        setClasses(teachingClasses);

        if (!selectedClassId && teachingClasses.length > 0) {
          setSelectedClassId(teachingClasses[0].classId);
        }
      } catch (error) {
        console.error('Erro ao carregar docência:', error);
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
  }, [user, selectedClassId]);

  const visibleClasses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return classes;
    }

    return classes.filter((teachingClass) => buildTeachingClassSearchText(teachingClass).includes(normalizedQuery));
  }, [classes, searchQuery]);

  const selectedClass = useMemo(() => {
    return visibleClasses.find((teachingClass) => teachingClass.classId === selectedClassId) || visibleClasses[0] || null;
  }, [selectedClassId, visibleClasses]);

  const stats: TeachingStats = useMemo(() => {
    const totalDiscentes = visibleClasses.reduce((sum, teachingClass) => sum + getTeachingClassStudentCount(teachingClass), 0);
    const totalDocentes = visibleClasses.reduce((sum, teachingClass) => sum + getTeachingClassProfessorCount(teachingClass), 0);

    return {
      totalTurmas: visibleClasses.length,
      turmasComImagem: visibleClasses.filter((teachingClass) => Boolean(getTeachingClassLogoSource(teachingClass))).length,
      totalDiscentes,
      totalDocentes,
      mediaDiscentes: visibleClasses.length === 0 ? 0 : Math.round(totalDiscentes / visibleClasses.length),
    };
  }, [visibleClasses]);

  useEffect(() => {
    if (selectedClass?.classId && selectedClass.classId !== selectedClassId) {
      setSelectedClassId(selectedClass.classId);
    }
  }, [selectedClass, selectedClassId]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    setSelectedClassId('');
    setSearchQuery('');
    if (user) {
      void loadUserTeachingClasses(user.uid)
        .then((teachingClasses) => {
          setClasses(teachingClasses);
          setSelectedClassId(teachingClasses[0]?.classId || '');
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    } else {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCopyJoinCode = async () => {
    if (!selectedClass?.joinCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedClass.joinCode);
    } catch (error) {
      console.error('Erro ao copiar código da turma:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando docência...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100 sm:mb-4 sm:text-xs">
                <Sparkles size={14} />
                Docência
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">Turmas em cards, com imagem, código e composição da sala</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/90 sm:text-[15px]">
                Esta visão usa a coleção de turmas docentes do desktop, não as equipes de projeto. Cada card mostra a identidade da turma, o período, o código e os participantes vinculados.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur sm:gap-4 sm:rounded-3xl">
              <AvatarDisplay
                avatar={currentProfile?.avatar || profileAvatar}
                imageSrc={currentProfile?.profilePhotoSource || ''}
                size="lg"
                fallback={currentProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                className="border border-white/20 shadow-lg"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Docente logado</p>
                <p className="text-base font-bold sm:text-lg">{currentProfile?.displayName || user?.displayName || 'Usuário'}</p>
                <p className="text-sm text-blue-100/90">{currentProfile?.headline || user?.email || ''}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-5">
            <StatCard icon={Layers3} label="Turmas" value={stats.totalTurmas} />
            <StatCard icon={BookOpen} label="Com imagem" value={stats.turmasComImagem} />
            <StatCard icon={Users} label="Discentes" value={stats.totalDiscentes} />
            <StatCard icon={Briefcase} label="Docentes" value={stats.totalDocentes} />
            <StatCard icon={GraduationCap} label="Média por turma" value={stats.mediaDiscentes} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <section className="space-y-4 sm:space-y-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">Galeria de turmas</h3>
                <p className="mt-1 text-sm text-slate-500">Busca por nome, curso, período, código e nomes relacionados.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Atualizando...' : 'Atualizar turmas'}
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Limpar busca
                </button>
              </div>
            </div>

            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar turma por nome, curso, período, código ou docente..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {visibleClasses.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:rounded-[2rem] sm:p-12">
                <GraduationCap size={48} className="mx-auto mb-4 text-slate-400" />
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma turma encontrada</h4>
                <p className="text-slate-600">
                  {searchQuery ? 'Ajuste a busca para localizar a turma desejada.' : 'Turmas docentes ainda não foram vinculadas a este usuário.'}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2 sm:gap-6">
                {visibleClasses.map((teachingClass) => {
                  const logoSource = getTeachingClassLogoSource(teachingClass);
                  const studentCount = getTeachingClassStudentCount(teachingClass);
                  const professorCount = getTeachingClassProfessorCount(teachingClass);
                  const isSelected = selectedClass?.classId === teachingClass.classId;

                  return (
                    <button
                      key={teachingClass.classId}
                      type="button"
                      onClick={() => setSelectedClassId(teachingClass.classId)}
                      className={`group flex w-full overflow-hidden rounded-[1.5rem] border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-[1.75rem] ${
                        isSelected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex h-full w-full flex-col">
                        <div className="flex items-start gap-3 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 sm:gap-4 sm:p-6">
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg sm:h-18 sm:w-18">
                            {logoSource ? (
                              <img src={logoSource} alt={teachingClass.className} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-black tracking-wider sm:text-lg">{teachingClass.className.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Turma docente</p>
                                <h4 className="mt-1 truncate text-lg font-bold text-slate-900 transition group-hover:text-blue-700 sm:text-xl">
                                  {teachingClass.className}
                                </h4>
                              </div>
                              <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {teachingClass.academicTerm || 'Sem período'}
                              </div>
                            </div>

                            <p className="mt-2 text-sm text-slate-600">{teachingClass.course || 'Curso não informado'}</p>
                            <p className="mt-1 text-xs text-slate-500">{buildTeachingClassBalanceLabel(teachingClass)}</p>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
                          <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                            {teachingClass.description || 'Canal da turma pronto para mural, código de entrada e acompanhamento pedagógico da disciplina.'}
                          </p>

                          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Discentes</p>
                              <p className="mt-1 text-2xl font-black text-slate-900">{studentCount}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Docentes</p>
                              <p className="mt-1 text-2xl font-black text-slate-900">{professorCount}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Código</p>
                              <p className="mt-1 text-2xl font-black text-slate-900">{teachingClass.joinCode || '—'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{teachingClass.representativeName || 'Sem representante'}</span>
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                              {teachingClass.professorNames.length > 0 ? teachingClass.professorNames[0] : 'Professor não informado'}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                              {teachingClass.studentSummaries.length > 0 ? `${teachingClass.studentSummaries.length} nomes carregados` : 'Sem lista detalhada'}
                            </span>
                          </div>

                          <div className="mt-auto border-t border-slate-100 pt-4">
                            <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-blue-700">
                              Abrir turma
                              <ArrowRight size={16} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-2xl font-bold text-slate-900">Turma selecionada</h3>
            <p className="mt-1 text-sm text-slate-500">Resumo da turma aberta na galeria.</p>
          </div>

          {selectedClass ? (
            <>
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 text-white shadow-lg">
                <div className="h-44 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900">
                  {getTeachingClassLogoSource(selectedClass) ? (
                    <img
                      src={getTeachingClassLogoSource(selectedClass)}
                      alt={selectedClass.className}
                      className="h-full w-full object-cover opacity-90"
                    />
                  ) : null}
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">{selectedClass.academicTerm || 'Sem período'}</p>
                    <h4 className="mt-2 text-2xl font-black">{selectedClass.className}</h4>
                    <p className="mt-1 text-sm text-slate-300">{selectedClass.course}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm sm:gap-3">
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Discentes</p>
                      <p className="mt-1 text-xl font-bold">{getTeachingClassStudentCount(selectedClass)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Docentes</p>
                      <p className="mt-1 text-xl font-bold">{getTeachingClassProfessorCount(selectedClass)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white/10 px-3 py-1">Código {selectedClass.joinCode || 'sem código'}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">{buildTeachingClassBalanceLabel(selectedClass)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Código de entrada</h4>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy size={14} />
                    Copiar
                  </button>
                </div>
                <p className="rounded-2xl bg-white px-4 py-3 text-sm font-mono text-slate-900">{selectedClass.joinCode || 'Sem código'}</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
                <h4 className="text-sm font-semibold text-slate-700">Professores vinculados</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedClass.professorNames.length > 0 ? (
                    selectedClass.professorNames.map((name) => (
                      <span key={name} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Sem professores informados</span>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
                <h4 className="text-sm font-semibold text-slate-700">Alunos cadastrados</h4>
                <div className="space-y-2">
                  {selectedClass.studentSummaries.length > 0 ? (
                    selectedClass.studentSummaries.slice(0, 8).map((student) => (
                      <div key={student.userId || `${student.name}-${student.registration}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.registration || student.email || student.role}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">Nenhum aluno foi listado para esta turma.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl">
                <h4 className="text-sm font-semibold text-slate-700">Descrição</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedClass.description || 'Canal da turma pronto para mural, código de entrada e acompanhamento pedagógico da disciplina.'}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:rounded-[2rem]">
              <GraduationCap size={44} className="mx-auto mb-4 text-slate-400" />
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma turma selecionada</h4>
              <p className="text-sm text-slate-600">Selecione um card para ver o código, os docentes e a lista de alunos.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:p-4">
      <Icon size={18} className="text-blue-100/90" />
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">{label}</p>
      <p className="mt-1 text-2xl font-black sm:text-3xl">{value}</p>
    </div>
  );
}
