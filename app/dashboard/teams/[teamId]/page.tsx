'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDocs, getFirestore, updateDoc } from 'firebase/firestore';
import AvatarDisplay from '../../../../components/AvatarDisplay';
import { DEFAULT_AVATAR } from '../../../../lib/avatarService';
import { useAuth } from '../../../../lib/useAuth';
import { getUserProfileService, type UserProfile } from '../../../../lib/userProfileService';
import {
  buildTeamBalanceLabel,
  buildTeamLeadershipLabel,
  buildTeamProfessorFocusLabel,
  createDefaultBoardColumns,
  getFacultyTeamMembers,
  getStudentTeamMembers,
  getTeamLogoSource,
  loadTeamWorkspaceByTeamId,
  type TeamBoardView,
  type TeamTaskCard,
  type TeamWorkspace,
} from '../../../../lib/teamWorkspaceService';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  SquareKanban,
  Users,
} from 'lucide-react';

type TaskDraft = {
  title: string;
  description: string;
  columnId: string;
  dueDate: string;
  priority: string;
  estimatedHours: string;
  workloadPoints: string;
  requiredRole: string;
};

type CsdDraft = {
  category: 'certainty' | 'assumption' | 'doubt';
  text: string;
};

const defaultTaskDraft: TaskDraft = {
  title: '',
  description: '',
  columnId: '',
  dueDate: '',
  priority: 'Media',
  estimatedHours: '4',
  workloadPoints: '3',
  requiredRole: 'student',
};

export default function TeamWorkspacePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const user = useAuth();
  const [team, setTeam] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [boardView, setBoardView] = useState<TeamBoardView>('trello');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(defaultTaskDraft);
  const [csdDraft, setCsdDraft] = useState<CsdDraft>({ category: 'certainty', text: '' });
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [draggedTaskCard, setDraggedTaskCard] = useState<{ cardId: string; fromColumnId: string } | null>(null);
  const [draggedCsdNote, setDraggedCsdNote] = useState<{ bucket: 'certainties' | 'assumptions' | 'doubts'; index: number } | null>(null);
  const isCompanyViewer = currentProfile?.role === 'company';

  useEffect(() => {
    const loadCurrentProfile = async () => {
      if (!user) {
        return;
      }

      try {
        const profile = await getUserProfileService().getUserProfile(user.uid);
        setCurrentProfile(profile);
      } catch (error) {
        console.error('Erro ao carregar perfil atual:', error);
      } finally {
        setProfileLoaded(true);
      }
    };

    void loadCurrentProfile();
  }, [user]);

  useEffect(() => {
    const teamId = params?.teamId;
    if (!teamId || Array.isArray(teamId)) {
      setLoading(false);
      return;
    }

    const loadTeam = async () => {
      try {
        const loadedTeam = await loadTeamWorkspaceByTeamId(teamId);
        setTeam(loadedTeam);
        if (loadedTeam?.taskColumns.length) {
          setTaskDraft((previous) => ({
            ...previous,
            columnId: previous.columnId || loadedTeam.taskColumns[0].id,
          }));
        } else {
          setTaskDraft((previous) => ({
            ...previous,
            columnId: previous.columnId || 'backlog',
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar equipe:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [params]);

  const boardColumns = useMemo(() => {
    if (!team) {
      return createDefaultBoardColumns();
    }

    return team.taskColumns.length > 0 ? team.taskColumns : createDefaultBoardColumns();
  }, [team]);

  const studentMembers = useMemo(() => (team ? getStudentTeamMembers(team) : []), [team]);
  const facultyMembers = useMemo(() => (team ? getFacultyTeamMembers(team) : []), [team]);

  const counts = useMemo(() => {
    if (!team) {
      return {
        overdue: 0,
        completedMilestones: 0,
        totalMilestones: 0,
        totalCards: 0,
      };
    }

    const overdue = team.taskColumns
      .flatMap((column) => column.cards)
      .filter((card) => card.dueDate && new Date(card.dueDate).getTime() < Date.now()).length;

    return {
      overdue,
      completedMilestones: team.milestones.filter((milestone) => milestone.status.toLowerCase().includes('concl')).length,
      totalMilestones: team.milestones.length,
      totalCards: team.taskColumns.reduce((sum, column) => sum + column.cards.length, 0),
    };
  }, [team]);

  const updateTeamDocument = async (updater: (currentTeam: TeamWorkspace) => TeamWorkspace) => {
    if (!team) {
      return;
    }

    const db = getFirestore();
    const snapshot = await getDocs(collection(db, 'teams'));
    const teamDoc = snapshot.docs.find((document) => document.data().teamId === team.teamId);
    if (!teamDoc) {
      return;
    }

    const updatedTeam = updater(team);
    await updateDoc(doc(db, 'teams', teamDoc.id), {
      ...updatedTeam,
      updatedAt: new Date().toISOString(),
    });
    setTeam(updatedTeam);
  };

  const handleTaskCardDragStart = (cardId: string, fromColumnId: string) => {
    setDraggedTaskCard({ cardId, fromColumnId });
  };

  const handleTaskCardDragEnd = () => {
    setDraggedTaskCard(null);
  };

  const handleTaskCardDrop = async (targetColumnId: string) => {
    if (!team || !draggedTaskCard) {
      return;
    }

    if (draggedTaskCard.fromColumnId === targetColumnId) {
      setDraggedTaskCard(null);
      return;
    }

    setSaving(true);
    try {
      await updateTeamDocument((currentTeam) => {
        const sourceColumns = currentTeam.taskColumns.length > 0 ? currentTeam.taskColumns : createDefaultBoardColumns();
        const sourceColumn = sourceColumns.find((column) => column.id === draggedTaskCard.fromColumnId);
        const targetColumn = sourceColumns.find((column) => column.id === targetColumnId);

        if (!sourceColumn || !targetColumn) {
          return currentTeam;
        }

        const card = sourceColumn.cards.find((item) => item.id === draggedTaskCard.cardId);
        if (!card) {
          return currentTeam;
        }

        const updatedColumns = sourceColumns.map((column) => {
          if (column.id === sourceColumn.id) {
            return {
              ...column,
              cards: column.cards.filter((item) => item.id !== draggedTaskCard.cardId),
            };
          }

          if (column.id === targetColumn.id) {
            return {
              ...column,
              cards: [
                ...column.cards,
                {
                  ...card,
                  columnId: targetColumn.id,
                },
              ],
            };
          }

          return column;
        });

        return {
          ...currentTeam,
          taskColumns: updatedColumns,
        };
      });
    } finally {
      setDraggedTaskCard(null);
      setSaving(false);
    }
  };

  const handleCsdNoteDragStart = (bucket: 'certainties' | 'assumptions' | 'doubts', index: number) => {
    setDraggedCsdNote({ bucket, index });
  };

  const handleCsdNoteDragEnd = () => {
    setDraggedCsdNote(null);
  };

  const handleCsdNoteDrop = async (targetBucket: 'certainties' | 'assumptions' | 'doubts') => {
    if (!team || !draggedCsdNote) {
      return;
    }

    if (draggedCsdNote.bucket === targetBucket) {
      setDraggedCsdNote(null);
      return;
    }

    setSaving(true);
    try {
      await updateTeamDocument((currentTeam) => {
        const updatedBoard = {
          ...currentTeam.csdBoard,
          certainties: [...currentTeam.csdBoard.certainties],
          assumptions: [...currentTeam.csdBoard.assumptions],
          doubts: [...currentTeam.csdBoard.doubts],
        };

        const sourceItems = [...updatedBoard[draggedCsdNote.bucket]];
        const [note] = sourceItems.splice(draggedCsdNote.index, 1);
        if (!note) {
          return currentTeam;
        }

        updatedBoard[draggedCsdNote.bucket] = sourceItems;
        updatedBoard[targetBucket] = [note, ...updatedBoard[targetBucket]];

        return {
          ...currentTeam,
          csdBoard: updatedBoard,
        };
      });
    } finally {
      setDraggedCsdNote(null);
      setSaving(false);
    }
  };

  const handleCopyTeamCode = async () => {
    if (!team) {
      return;
    }

    try {
      await navigator.clipboard.writeText(team.teamId);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };

  const handleAddTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!team || !taskDraft.title.trim()) {
      return;
    }

    const targetColumnId = taskDraft.columnId || boardColumns[0]?.id || 'backlog';

    setSaving(true);
    try {
      await updateTeamDocument((currentTeam) => ({
        ...currentTeam,
        taskColumns: (currentTeam.taskColumns.length > 0 ? currentTeam.taskColumns : createDefaultBoardColumns()).map((column) => {
          if (column.id !== targetColumnId) {
            return column;
          }

          const newCard: TeamTaskCard = {
            id: `${column.id}-${Date.now()}`,
            columnId: column.id,
            title: taskDraft.title,
            description: taskDraft.description,
            priority: taskDraft.priority,
            dueDate: taskDraft.dueDate || undefined,
            estimatedHours: Number(taskDraft.estimatedHours) || 0,
            workloadPoints: Number(taskDraft.workloadPoints) || 0,
            requiredRole: taskDraft.requiredRole,
            requiresProfessorReview: taskDraft.requiredRole !== 'student',
            assignedUserIds: [],
            mentionedUserIds: [],
          };

          return {
            ...column,
            cards: [...column.cards, newCard],
          };
        }),
      }));

      setTaskDraft({ ...defaultTaskDraft, columnId: targetColumnId });
      setIsTaskModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCsdNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!team || !csdDraft.text.trim()) {
      return;
    }

    setSaving(true);
    try {
      await updateTeamDocument((currentTeam) => {
        const updatedBoard = { ...currentTeam.csdBoard };
        const note = csdDraft.text.trim();

        if (csdDraft.category === 'certainty') {
          updatedBoard.certainties = [note, ...updatedBoard.certainties];
        } else if (csdDraft.category === 'assumption') {
          updatedBoard.assumptions = [note, ...updatedBoard.assumptions];
        } else {
          updatedBoard.doubts = [note, ...updatedBoard.doubts];
        }

        return {
          ...currentTeam,
          csdBoard: updatedBoard,
        };
      });

      setCsdDraft({ category: 'certainty', text: '' });
      setIsTaskModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading || (user && !profileLoaded)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando equipe...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Equipe não encontrada</h2>
        <p className="mt-2 text-slate-600">Não foi possível localizar a workspace desta equipe no Firestore.</p>
        <button
          onClick={() => router.push('/dashboard/teams')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          <ArrowLeft size={16} />
          Voltar para equipes
        </button>
      </div>
    );
  }

  const teamLogoSource = getTeamLogoSource(team);

  if (isCompanyViewer) {
    const studentMembersView = getStudentTeamMembers(team);
    const facultyMembersView = getFacultyTeamMembers(team);
    const assetCount = team.assets.length;
    const milestoneCount = team.milestones.length;

    return (
      <div className="space-y-6 pb-10">
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 p-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-5">
              <button
                onClick={() => router.push('/dashboard/projetos')}
                className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                title="Voltar"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="relative">
                {teamLogoSource ? (
                  <img
                    src={teamLogoSource}
                    alt={team.teamName}
                    className="h-20 w-20 rounded-2xl border border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg">
                    {team.teamName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="max-w-4xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Visualização da empresa</p>
                <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">{team.teamName}</h1>
                <p className="mt-2 text-sm text-slate-600">{team.course} • {team.className || 'Turma não informada'} • {team.academicTerm || 'sem semestre'}</p>
                <p className="mt-3 text-sm text-slate-600">{buildTeamBalanceLabel(team)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard/chats"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Conversar
              </a>
              <a
                href="/dashboard/contato-institucional"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Contato institucional
              </a>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Users} label="Discentes" value={studentMembersView.length.toString()} subtitle="Equipe de execução" accent="from-blue-500 to-blue-600" />
            <MetricCard icon={Settings2} label="Docentes" value={facultyMembersView.length.toString()} subtitle="Professor focal e orientadores" accent="from-violet-500 to-violet-600" />
            <MetricCard icon={SquareKanban} label="Arquivos" value={assetCount.toString()} subtitle="Materiais visíveis" accent="from-emerald-500 to-emerald-600" />
            <MetricCard icon={Calendar} label="Marcos" value={milestoneCount.toString()} subtitle={`${counts.overdue} em atraso`} accent="from-amber-500 to-amber-600" />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Membros do projeto</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {studentMembersView.map((member) => (
                  <span key={member.userId || member.name} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {member.name}
                  </span>
                ))}
                {facultyMembersView.map((member) => (
                  <span key={member.userId || member.name} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {member.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Arquivos</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {team.assets.slice(0, 8).map((asset) => (
                  <div key={asset.assetId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{asset.fileName || 'Arquivo'}</p>
                    <p className="mt-1 text-xs text-slate-500">{asset.category || 'Material'} • {asset.description || 'Sem descrição'}</p>
                  </div>
                ))}
                {team.assets.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Nenhum arquivo anexado.</p>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Resumo</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{buildTeamProfessorFocusLabel(team)}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{buildTeamLeadershipLabel(team)}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{team.teacherNotes || 'Sem observações adicionais.'}</p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Marcos recentes</h2>
              <div className="mt-4 space-y-3">
                {team.milestones.slice(0, 5).map((milestone) => (
                  <div key={milestone.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{milestone.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{milestone.status}</p>
                  </div>
                ))}
                {team.milestones.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Nenhum marco registrado.</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-5">
            <button
              onClick={() => router.push('/dashboard/teams')}
              className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="relative">
              {teamLogoSource ? (
                <img
                  src={teamLogoSource}
                  alt={team.teamName}
                  className="h-20 w-20 rounded-2xl border border-white object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg">
                  {team.teamName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow-md">
                <div className="rounded-full bg-emerald-500 p-2 text-white">
                  <ShieldCheck size={12} />
                </div>
              </div>
            </div>

            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Workspace da equipe</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">{team.teamName}</h1>
              <p className="mt-2 text-sm text-slate-600">{team.course} • {team.className || 'Turma não informada'} • {team.academicTerm || 'sem semestre'}</p>
              <p className="mt-3 text-sm text-slate-600">{buildTeamBalanceLabel(team)}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{buildTeamProfessorFocusLabel(team)}</span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">{buildTeamLeadershipLabel(team)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Código {team.teamId}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{team.projectStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyTeamCode}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy size={16} />
              Copiar código
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={16} />
              {boardView === 'csd' ? 'Nova nota CSD' : 'Nova tarefa'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Discentes" value={studentMembers.length.toString()} subtitle="Equipe de execução" accent="from-blue-500 to-blue-600" />
          <MetricCard icon={Settings2} label="Docentes" value={facultyMembers.length.toString()} subtitle="Professor focal e orientadores" accent="from-violet-500 to-violet-600" />
          <MetricCard icon={SquareKanban} label="Cards" value={counts.totalCards.toString()} subtitle="Quadro do projeto" accent="from-emerald-500 to-emerald-600" />
          <MetricCard icon={Calendar} label="Marcos" value={`${counts.completedMilestones}/${counts.totalMilestones}`} subtitle={`${counts.overdue} em atraso`} accent="from-amber-500 to-amber-600" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Board do projeto</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Alternância entre Trello, Kanban e CSD, igual ao workspace do desktop.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'trello', label: 'Trello', icon: SquareKanban },
                  { id: 'kanban', label: 'KANBAN', icon: LayoutGrid },
                  { id: 'csd', label: 'CSD', icon: ClipboardList },
                ] as const).map((item) => {
                  const isActive = boardView === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setBoardView(item.id)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              {boardView === 'csd' ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <CsdColumn
                    title="Certezas"
                    bucket="certainties"
                    accent="from-emerald-500 to-emerald-600"
                    items={team.csdBoard.certainties}
                    onDragStartNote={handleCsdNoteDragStart}
                    onDragEndNote={handleCsdNoteDragEnd}
                    onDropBucket={handleCsdNoteDrop}
                  />
                  <CsdColumn
                    title="Suposições"
                    bucket="assumptions"
                    accent="from-amber-500 to-amber-600"
                    items={team.csdBoard.assumptions}
                    onDragStartNote={handleCsdNoteDragStart}
                    onDragEndNote={handleCsdNoteDragEnd}
                    onDropBucket={handleCsdNoteDrop}
                  />
                  <CsdColumn
                    title="Dúvidas"
                    bucket="doubts"
                    accent="from-rose-500 to-rose-600"
                    items={team.csdBoard.doubts}
                    onDragStartNote={handleCsdNoteDragStart}
                    onDragEndNote={handleCsdNoteDragEnd}
                    onDropBucket={handleCsdNoteDrop}
                  />
                </div>
              ) : (
                <div className={boardView === 'kanban' ? 'grid gap-4 xl:grid-cols-4' : 'grid gap-4 lg:grid-cols-2 xl:grid-cols-4'}>
                  {boardColumns.map((column) => {
                    const isKanban = boardView === 'kanban';
                    const isDropTarget = draggedTaskCard !== null;
                    return (
                      <div
                        key={column.id}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={async () => await handleTaskCardDrop(column.id)}
                        className={`rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 transition ${isKanban ? 'shadow-sm' : ''} ${isDropTarget ? 'ring-2 ring-blue-300' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{column.title}</p>
                            <p className="text-xs text-slate-500">{column.cards.length} card(s)</p>
                          </div>
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: column.accentColor }} />
                        </div>

                        <div className="mt-4 space-y-3">
                          {column.cards.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                              Nenhum card nesta coluna.
                            </div>
                          ) : (
                            column.cards.map((card) => (
                              <article
                                key={card.id}
                                draggable
                                onDragStart={() => handleTaskCardDragStart(card.id, column.id)}
                                onDragEnd={handleTaskCardDragEnd}
                                className={`cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing ${draggedTaskCard?.cardId === card.id ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                                    {card.description && <p className="mt-1 text-xs leading-5 text-slate-600">{card.description}</p>}
                                  </div>
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                                    {card.priority}
                                  </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                                  {card.dueDate && (
                                    <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                                      {new Date(card.dueDate).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  <span className="rounded-full bg-slate-100 px-2 py-1">{card.workloadPoints} pts</span>
                                  <span className="rounded-full bg-slate-100 px-2 py-1">{card.estimatedHours}h</span>
                                  {card.requiresProfessorReview && (
                                    <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">Revisão docente</span>
                                  )}
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PanelCard title="Linha do semestre" description="Marcos e etapas que o desktop usa para acompanhar a evolução acadêmica." icon={Sparkles}>
              {team.semesterTimeline.length === 0 ? (
                <EmptyText message="Nenhuma etapa cadastrada ainda." />
              ) : (
                <div className="space-y-3">
                  {team.semesterTimeline.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            <PanelCard title="Marcos acadêmicos" description="Entregas e checkpoints da equipe." icon={CheckCircle2}>
              {team.milestones.length === 0 ? (
                <EmptyText message="Nenhum marco planejado ainda." />
              ) : (
                <div className="space-y-3">
                  {team.milestones.slice(0, 4).map((milestone) => (
                    <div key={milestone.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{milestone.title}</p>
                          {milestone.notes && <p className="mt-1 text-sm text-slate-600">{milestone.notes}</p>}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{milestone.status}</span>
                      </div>
                      {milestone.dueDate && <p className="mt-3 text-xs text-slate-500">Prazo: {new Date(milestone.dueDate).toLocaleDateString('pt-BR')}</p>}
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
        </section>

        <aside className="space-y-6">
          <PanelCard title="Pessoas e papéis" description="Alunos executam; docência orienta e governa." icon={Users}>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Equipe discente</p>
                {studentMembers.length === 0 ? (
                  <EmptyText message="Nenhum aluno vinculado." />
                ) : (
                  <div className="space-y-3">
                    {studentMembers.map((member) => (
                      <PersonRow key={member.userId || member.name} member={member} accent="bg-blue-50 text-blue-700" />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Orientação docente</p>
                {facultyMembers.length === 0 ? (
                  <EmptyText message="Nenhum docente vinculado." />
                ) : (
                  <div className="space-y-3">
                    {facultyMembers.map((member) => (
                      <PersonRow key={member.userId || member.name} member={member} accent="bg-violet-50 text-violet-700" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Arquivos e planos" description="Ativos e referências da workspace." icon={FileText}>
            {team.assets.length === 0 ? (
              <EmptyText message="Nenhum arquivo publicado." />
            ) : (
              <div className="space-y-3">
                {team.assets.slice(0, 5).map((asset) => (
                  <div key={asset.assetId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{asset.fileName || asset.category}</p>
                        <p className="mt-1 text-sm text-slate-600">{asset.description || asset.folderPath || 'Arquivo da equipe'}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">v{asset.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Radar rápido" description="Resumo operacional e de governança." icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Cards" value={counts.totalCards.toString()} />
              <MiniStat label="Atrasos" value={counts.overdue.toString()} />
              <MiniStat label="Marcos" value={`${counts.completedMilestones}/${counts.totalMilestones}`} />
              <MiniStat label="Status" value={team.projectStatus} />
            </div>
          </PanelCard>

          <PanelCard title="Observações docentes" description="Anotações e notificações do workspace." icon={ClipboardList}>
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Notas do professor</p>
                <p className="mt-2 text-sm text-slate-600">{team.teacherNotes || 'Sem observações registradas.'}</p>
              </div>
              {team.notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{notification.type} • {new Date(notification.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        </aside>
      </div>

      {isTaskModalOpen && (
        <ModalShell title={boardView === 'csd' ? 'Nova nota CSD' : 'Nova tarefa'} onClose={() => setIsTaskModalOpen(false)}>
          {boardView === 'csd' ? (
            <form onSubmit={handleAddCsdNote} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Categoria</span>
                <select
                  value={csdDraft.category}
                  onChange={(event) => setCsdDraft((previous) => ({ ...previous, category: event.target.value as CsdDraft['category'] }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="certainty">Certeza</option>
                  <option value="assumption">Suposição</option>
                  <option value="doubt">Dúvida</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Texto</span>
                <textarea
                  value={csdDraft.text}
                  onChange={(event) => setCsdDraft((previous) => ({ ...previous, text: event.target.value }))}
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700">
                  Cancelar
                </button>
                <button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Título</span>
                  <input
                    value={taskDraft.title}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, title: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Descrição</span>
                  <textarea
                    value={taskDraft.description}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, description: event.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Coluna</span>
                  <select
                    value={taskDraft.columnId || boardColumns[0]?.id || 'backlog'}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, columnId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {boardColumns.map((column) => (
                      <option key={column.id} value={column.id}>{column.title}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Prazo</span>
                  <input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, dueDate: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Prioridade</span>
                  <select
                    value={taskDraft.priority}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, priority: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Media">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Carga</span>
                  <input
                    value={taskDraft.estimatedHours}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, estimatedHours: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Pontos</span>
                  <input
                    value={taskDraft.workloadPoints}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, workloadPoints: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Nível de acesso</span>
                  <select
                    value={taskDraft.requiredRole}
                    onChange={(event) => setTaskDraft((previous) => ({ ...previous, requiredRole: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="student">Aluno</option>
                    <option value="leader">Liderança discente</option>
                    <option value="professor">Professor</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700">
                  Cancelar
                </button>
                <button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
                  Salvar tarefa
                </button>
              </div>
            </form>
          )}
        </ModalShell>
      )}

    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function PanelCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CsdColumn({
  title,
  bucket,
  accent,
  items,
  onDragStartNote,
  onDragEndNote,
  onDropBucket,
}: {
  title: string;
  bucket: 'certainties' | 'assumptions' | 'doubts';
  accent: string;
  items: string[];
  onDragStartNote: (bucket: 'certainties' | 'assumptions' | 'doubts', index: number) => void;
  onDragEndNote: () => void;
  onDropBucket: (bucket: 'certainties' | 'assumptions' | 'doubts') => Promise<void>;
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={async () => await onDropBucket(bucket)}
      className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4"
    >
      <div className={`mb-4 rounded-2xl bg-gradient-to-r ${accent} px-4 py-3 text-white`}>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs opacity-90">{items.length} item(ns)</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyText message="Sem itens registrados." />
        ) : (
          items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              draggable
              onDragStart={() => onDragStartNote(bucket, index)}
              onDragEnd={onDragEndNote}
              className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm active:cursor-grabbing"
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PersonRow({ member, accent }: { member: { name: string; avatar: typeof DEFAULT_AVATAR; profilePhotoSource: string }; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <AvatarDisplay avatar={member.avatar} imageSrc={member.profilePhotoSource || ''} size="sm" fallback={member.name.charAt(0).toUpperCase()} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{member.name}</p>
        <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${accent}`}>{member.name ? 'Ativo' : 'Membro'}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyText({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">{message}</p>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
            <ArrowLeft size={18} className="rotate-180" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
