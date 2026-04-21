'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/useAuth';
import { getUserProfileService, type UserCalendarEntry } from '../../lib/userProfileService';
import { AvatarComponents, DEFAULT_AVATAR } from '../../lib/avatarService';
import AvatarDisplay from '../../components/AvatarDisplay';
import AvatarSelector from '../../components/AvatarSelector';
import { auth } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import {
  Edit3,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Briefcase,
  UserCircle2,
  Camera,
  Save,
  BadgeInfo,
  Code2,
  Building2,
  Brain,
  FileText,
  Star,
} from 'lucide-react';

interface ProfileFormState {
  uid: string;
  role: string;
  displayName: string;
  email: string;
  headline: string;
  course: string;
  registration: string;
  phoneNumber: string;
  academicDepartment: string;
  academicFocus: string;
  programmingLanguages: string;
  bio: string;
  professionalSummary: string;
  companyLegalName: string;
  companyCnpj: string;
  companySegment: string;
  companyContactName: string;
  companyContactRole: string;
  companyPhone: string;
  companyWebsite: string;
  companyDescription: string;
  profilePhotoDataUri: string;
  avatar: AvatarComponents;
  calendarEntries: UserCalendarEntry[];
}

const emptyProfile: ProfileFormState = {
  uid: '',
  role: 'student',
  displayName: '',
  email: '',
  headline: '',
  course: '',
  registration: '',
  phoneNumber: '',
  academicDepartment: '',
  academicFocus: '',
  programmingLanguages: '',
  bio: '',
  professionalSummary: '',
  companyLegalName: '',
  companyCnpj: '',
  companySegment: '',
  companyContactName: '',
  companyContactRole: '',
  companyPhone: '',
  companyWebsite: '',
  companyDescription: '',
  profilePhotoDataUri: '',
  avatar: DEFAULT_AVATAR,
  calendarEntries: [],
};

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export default function ProfilePage() {
  const user = useAuth();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileFormState>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarComponents>(DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditingAvatar) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditingAvatar]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userProfileService = getUserProfileService();
        const firebaseProfile = await userProfileService.getUserProfile(user.uid);

        const loadedProfile: ProfileFormState = {
          uid: user.uid,
          role: firebaseProfile?.role || 'student',
          displayName: firebaseProfile?.displayName || user.displayName || '',
          email: firebaseProfile?.email || user.email || '',
          headline: firebaseProfile?.headline || '',
          course: firebaseProfile?.course || '',
          registration: firebaseProfile?.registration || '',
          phoneNumber: firebaseProfile?.phoneNumber || '',
          academicDepartment: firebaseProfile?.academicDepartment || '',
          academicFocus: firebaseProfile?.academicFocus || '',
          programmingLanguages: firebaseProfile?.programmingLanguages || '',
          bio: firebaseProfile?.bio || '',
          professionalSummary: firebaseProfile?.professionalSummary || firebaseProfile?.bio || '',
          companyLegalName: firebaseProfile?.companyLegalName || '',
          companyCnpj: firebaseProfile?.companyCnpj || '',
          companySegment: firebaseProfile?.companySegment || '',
          companyContactName: firebaseProfile?.companyContactName || '',
          companyContactRole: firebaseProfile?.companyContactRole || '',
          companyPhone: firebaseProfile?.companyPhone || '',
          companyWebsite: firebaseProfile?.companyWebsite || '',
          companyDescription: firebaseProfile?.companyDescription || '',
          profilePhotoDataUri: firebaseProfile?.profilePhotoDataUri || firebaseProfile?.profilePhotoSource || '',
          avatar: firebaseProfile?.avatar || DEFAULT_AVATAR,
          calendarEntries: firebaseProfile?.calendarEntries || [],
        };

        setProfile(loadedProfile);
        setTempAvatar(loadedProfile.avatar);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleProfileChange = (field: keyof ProfileFormState, value: string) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUri = await fileToDataUri(file);
      setProfile((previous) => ({
        ...previous,
        profilePhotoDataUri: dataUri,
      }));
    } catch (error) {
      console.error('Erro ao carregar foto de perfil:', error);
    } finally {
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.uid) {
      return;
    }

    try {
      setSaving(true);
      const userProfileService = getUserProfileService();

      await userProfileService.updateUserProfile(profile.uid, {
        role: profile.role,
        displayName: profile.displayName,
        email: profile.email,
        headline: profile.headline,
        course: profile.course,
        registration: profile.registration,
        phoneNumber: profile.phoneNumber,
        academicDepartment: profile.academicDepartment,
        academicFocus: profile.academicFocus,
        programmingLanguages: profile.programmingLanguages,
        bio: profile.bio,
        professionalSummary: profile.professionalSummary,
        companyName: profile.displayName,
        companyLegalName: profile.companyLegalName,
        companyCnpj: profile.companyCnpj,
        companySegment: profile.companySegment,
        companyContactName: profile.companyContactName,
        companyContactRole: profile.companyContactRole,
        companyPhone: profile.companyPhone,
        companyWebsite: profile.companyWebsite,
        companyDescription: profile.companyDescription,
        profilePhotoDataUri: profile.profilePhotoDataUri,
        profilePhotoSource: profile.profilePhotoDataUri,
        profilePhoto: profile.profilePhotoDataUri,
      });

      if (auth.currentUser && profile.displayName) {
        await updateProfile(auth.currentUser, { displayName: profile.displayName });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!profile.uid) {
      return;
    }

    try {
      setSaving(true);
      const userProfileService = getUserProfileService();
      await userProfileService.updateUserAvatar(profile.uid, tempAvatar);
      setProfile((previous) => ({
        ...previous,
        avatar: tempAvatar,
      }));
      setIsEditingAvatar(false);
    } catch (error) {
      console.error('Erro ao salvar avatar:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile.uid) {
    return <div className="py-12 text-center text-slate-500">Perfil não encontrado</div>;
  }

  const profileImageSource = profile.profilePhotoDataUri || '';
  const isCompanyProfile = profile.role === 'company';

  if (isCompanyProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="sticky top-0 z-20 flex h-auto items-start border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:items-center sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Perfil empresarial</h1>
            <p className="mt-1 text-sm text-slate-500">Foto, avatar e informações institucionais da empresa</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-8">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-5 text-white sm:px-6 sm:py-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative">
                      <AvatarDisplay
                        avatar={profile.avatar}
                        imageSrc={profileImageSource}
                        size="lg"
                        fallback={profile.displayName?.charAt(0).toUpperCase() || 'E'}
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute bottom-2 right-2 rounded-full bg-slate-950/90 p-2 text-white shadow-lg transition hover:bg-slate-900"
                        title="Trocar foto da empresa"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePhotoUpload}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold sm:text-2xl">{profile.displayName || 'Empresa'}</p>
                      <p className="mt-1 text-sm text-blue-100">{profile.companyContactRole || 'Contato institucional'}</p>
                      <p className="mt-2 text-sm text-blue-50/90 sm:mt-3">{profile.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 text-sm sm:gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">CNPJ</p>
                      <p className="mt-1 font-semibold text-slate-900">{profile.companyCnpj || 'Não informado'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Segmento</p>
                      <p className="mt-1 font-semibold text-slate-900">{profile.companySegment || 'Não informado'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Responsável</p>
                      <p className="mt-1 font-semibold text-slate-900">{profile.companyContactName || 'Não informado'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Telefone</p>
                      <p className="mt-1 font-semibold text-slate-900">{profile.companyPhone || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Perfil empresarial</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Avatar e foto</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <BadgeInfo size={16} />
                      Foto / Avatar
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      A empresa pode alternar entre foto real e avatar, mantendo o mesmo fluxo de edição dos demais perfis.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setTempAvatar(profile.avatar);
                        setIsEditingAvatar(true);
                      }}
                      className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 sm:flex-1"
                    >
                      Editar avatar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                    >
                      {saving ? 'Salvando...' : 'Salvar perfil'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Star size={18} className="text-amber-500" />
                  Descrição institucional
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  {profile.companyDescription || 'Adicione uma descrição institucional para apresentar a empresa aos alunos e à coordenação.'}
                </p>
              </div>
            </aside>

            <main className="space-y-4 lg:space-y-6">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Informações da empresa</h2>
                    <p className="text-sm text-slate-500">Campos institucionais editáveis e foto do perfil</p>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <Save size={16} />
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-5">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <UserCircle2 size={18} />
                      Identificação institucional
                    </h3>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Nome da empresa</span>
                      <input
                        type="text"
                        value={profile.displayName}
                        onChange={(event) => handleProfileChange('displayName', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        placeholder="Nome de exibição da empresa"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Razão social</span>
                      <input
                        type="text"
                        value={profile.companyLegalName}
                        onChange={(event) => handleProfileChange('companyLegalName', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">CNPJ</span>
                      <input
                        type="text"
                        value={profile.companyCnpj}
                        onChange={(event) => handleProfileChange('companyCnpj', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Segmento</span>
                      <input
                        type="text"
                        value={profile.companySegment}
                        onChange={(event) => handleProfileChange('companySegment', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </section>

                  <section className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-5">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <Building2 size={18} />
                      Contato institucional
                    </h3>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Nome do contato</span>
                      <input
                        type="text"
                        value={profile.companyContactName}
                        onChange={(event) => handleProfileChange('companyContactName', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Cargo / função</span>
                      <input
                        type="text"
                        value={profile.companyContactRole}
                        onChange={(event) => handleProfileChange('companyContactRole', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Telefone</span>
                      <input
                        type="text"
                        value={profile.companyPhone}
                        onChange={(event) => handleProfileChange('companyPhone', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Website</span>
                      <input
                        type="text"
                        value={profile.companyWebsite}
                        onChange={(event) => handleProfileChange('companyWebsite', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        placeholder="https://..."
                      />
                    </label>
                  </section>

                  <section className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-5 lg:col-span-2">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <FileText size={18} />
                      Descrição institucional
                    </h3>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Resumo da empresa</span>
                      <textarea
                        value={profile.companyDescription}
                        onChange={(event) => handleProfileChange('companyDescription', event.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        placeholder="Descreva a empresa, área de atuação e disponibilidade de contato"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                      />
                    </label>
                  </section>
                </div>
              </div>

              {isEditingAvatar && (
                <div
                  className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/80 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-4"
                  onClick={() => setIsEditingAvatar(false)}
                >
                  <div
                    className="flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white shadow-2xl sm:rounded-[2rem]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-4 py-4 text-white sm:flex-row sm:items-start sm:justify-between sm:px-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Editor visual</p>
                        <h3 className="text-xl font-black sm:text-2xl">Personalize o avatar da empresa</h3>
                        <p className="mt-1 text-sm text-blue-100/90">Escolha, ajuste e confirme a representação visual institucional.</p>
                      </div>
                      <button
                        onClick={() => setIsEditingAvatar(false)}
                        className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:w-auto"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden bg-slate-100">
                      <AvatarSelector
                        value={tempAvatar}
                        onChange={setTempAvatar}
                        onClose={handleSaveAvatar}
                        showSuggestions={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="sticky top-0 z-20 flex h-auto items-start border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:items-center sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Perfil acadêmico</h1>
          <p className="mt-1 text-sm text-slate-500">Dados pessoais, foto, avatar, curso e campos de docência</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-5 text-white sm:px-6 sm:py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative">
                    <AvatarDisplay
                      avatar={profile.avatar}
                      imageSrc={profileImageSource}
                      size="lg"
                      fallback={profile.displayName?.charAt(0).toUpperCase() || 'U'}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-2 right-2 rounded-full bg-slate-950/90 p-2 text-white shadow-lg transition hover:bg-slate-900"
                      title="Trocar foto de perfil"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoUpload}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold sm:text-2xl">{profile.displayName || 'Usuário'}</p>
                    <p className="mt-1 text-sm text-blue-100">{profile.headline || 'Perfil acadêmico e profissional'}</p>
                    <p className="mt-2 text-sm text-blue-50/90 sm:mt-3">{profile.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-2 text-sm sm:gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Curso</p>
                    <p className="mt-1 font-semibold text-slate-900">{profile.course || 'Não informado'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Matrícula</p>
                    <p className="mt-1 font-semibold text-slate-900">{profile.registration || 'Não informada'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Departamento</p>
                    <p className="mt-1 font-semibold text-slate-900">{profile.academicDepartment || 'Não informado'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Foco</p>
                    <p className="mt-1 font-semibold text-slate-900">{profile.academicFocus || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.programmingLanguages ? (
                    profile.programmingLanguages.split(',').map((item) => (
                      <span key={item.trim()} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Sem linguagens</span>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <BadgeInfo size={16} />
                    Foto / Avatar
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    O perfil usa foto real quando ela existe. Se não houver foto, o avatar por camadas entra como fallback, igual ao desktop.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setTempAvatar(profile.avatar);
                      setIsEditingAvatar(true);
                    }}
                    className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 sm:flex-1"
                  >
                    Editar avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing((previous) => !previous)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-1"
                  >
                    {isEditing ? 'Fechar edição' : 'Editar perfil'}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Star size={18} className="text-amber-500" />
                Resumo profissional
              </div>
              <p className="text-sm leading-7 text-slate-600">
                {profile.professionalSummary || profile.bio || 'Adicione um resumo profissional para refletir sua atuação acadêmica.'}
              </p>
            </div>
          </aside>

          <main className="space-y-4 lg:space-y-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Informações completas</h2>
                  <p className="text-sm text-slate-500">Campos sincronizados com a lógica do aplicativo desktop</p>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-5">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <UserCircle2 size={18} />
                    Conta e contato
                  </h3>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Nome completo</span>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(event) => handleProfileChange('displayName', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Telefone</span>
                    <input
                      type="text"
                      value={profile.phoneNumber}
                      onChange={(event) => handleProfileChange('phoneNumber', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Título / headline</span>
                    <input
                      type="text"
                      value={profile.headline}
                      onChange={(event) => handleProfileChange('headline', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      placeholder="Ex: Analista de Sistemas"
                    />
                  </label>
                </section>

                <section className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-5">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <GraduationCap size={18} />
                    Dados acadêmicos
                  </h3>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Curso</span>
                    <input
                      type="text"
                      value={profile.course}
                      onChange={(event) => handleProfileChange('course', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Matrícula</span>
                    <input
                      type="text"
                      value={profile.registration}
                      onChange={(event) => handleProfileChange('registration', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Departamento acadêmico</span>
                    <input
                      type="text"
                      value={profile.academicDepartment}
                      onChange={(event) => handleProfileChange('academicDepartment', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Foco acadêmico</span>
                    <input
                      type="text"
                      value={profile.academicFocus}
                      onChange={(event) => handleProfileChange('academicFocus', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Linguagens / habilidades</span>
                    <input
                      type="text"
                      value={profile.programmingLanguages}
                      onChange={(event) => handleProfileChange('programmingLanguages', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      placeholder="Ex: C#, TypeScript, SQL"
                    />
                  </label>
                </section>

                <section className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:rounded-3xl sm:p-5 lg:col-span-2">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FileText size={18} />
                    Biografia e resumo
                  </h3>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Resumo profissional</span>
                    <textarea
                      value={profile.professionalSummary}
                      onChange={(event) => handleProfileChange('professionalSummary', event.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      placeholder="Conte sua experiência, interesses e atuação acadêmica"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Bio</span>
                    <textarea
                      value={profile.bio}
                      onChange={(event) => handleProfileChange('bio', event.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      placeholder="Bio pública exibida no perfil"
                    />
                  </label>
                </section>
              </div>
            </div>

            {isEditingAvatar && (
              <div
                className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/80 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-4"
                onClick={() => setIsEditingAvatar(false)}
              >
                <div
                  className="flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white shadow-2xl sm:rounded-[2rem]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-4 py-4 text-white sm:flex-row sm:items-start sm:justify-between sm:px-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Editor visual</p>
                      <h3 className="text-xl font-black sm:text-2xl">Personalize seu avatar</h3>
                      <p className="mt-1 text-sm text-blue-100/90">Tela expandida com o mesmo fluxo do desktop: escolha, preview e confirme.</p>
                    </div>
                    <button
                      onClick={() => setIsEditingAvatar(false)}
                      className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:w-auto"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden bg-slate-100">
                    <AvatarSelector
                      value={tempAvatar}
                      onChange={setTempAvatar}
                      onClose={handleSaveAvatar}
                      showSuggestions={true}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Briefcase size={18} />
                  Informações salvas no perfil
                </h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-900">Email:</span> {profile.email}</p>
                  <p><span className="font-semibold text-slate-900">Telefone:</span> {profile.phoneNumber || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-900">Curso:</span> {profile.course || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-900">Matrícula:</span> {profile.registration || 'Não informada'}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Brain size={18} />
                  Docência / Acadêmico
                </h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-900">Departamento:</span> {profile.academicDepartment || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-900">Foco:</span> {profile.academicFocus || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-900">Linguagens:</span> {profile.programmingLanguages || 'Não informadas'}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6 lg:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Calendar size={18} />
                  Avisos da coordenação
                </h3>
                {profile.calendarEntries && profile.calendarEntries.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {profile.calendarEntries.slice(0, 6).map((entry) => (
                      <div key={entry.entryId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{entry.contextLabel || 'Coordenação'}</p>
                            <h4 className="mt-1 text-sm font-bold text-slate-900">{entry.title}</h4>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">{entry.entryType || 'Aviso'}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{entry.notes || 'Sem observações adicionais.'}</p>
                        <p className="mt-3 text-xs text-slate-500">{new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Nenhum aviso de coordenação foi encontrado neste perfil.
                  </p>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
