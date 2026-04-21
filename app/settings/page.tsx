'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/useAuth';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  Bell,
  Lock,
  Accessibility,
  LogOut,
  ChevronRight,
  Moon,
  Smartphone,
  SunMedium,
  Monitor,
  Gauge,
  ShieldCheck,
  BellRing,
  UserRoundCog,
  PanelTopOpen,
} from 'lucide-react';

const ACCESSIBILITY_STORAGE_KEY = 'choas.accessibilityPreferences';
const SETTINGS_STORAGE_KEY = 'choas.settingsPreferences';

type AccessibilityPreferences = {
  highContrastEnabled: boolean;
  darkModeEnabled: boolean;
  textScalePercent: number;
  reduceAnimations: boolean;
};

type SettingsState = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  privateProfile: boolean;
  twoFactorAuth: boolean;
  activityDigest: boolean;
  readReceipts: boolean;
  showOnlineStatus: boolean;
};

const defaultAccessibility: AccessibilityPreferences = {
  highContrastEnabled: false,
  darkModeEnabled: false,
  textScalePercent: 100,
  reduceAnimations: false,
};

const defaultSettings: SettingsState = {
  emailNotifications: true,
  pushNotifications: false,
  privateProfile: false,
  twoFactorAuth: false,
  activityDigest: true,
  readReceipts: true,
  showOnlineStatus: true,
};

const settingsTabs = [
  { id: 'account', label: 'Conta', icon: UserRoundCog },
  { id: 'notifications', label: 'Notificações', icon: BellRing },
  { id: 'privacy', label: 'Privacidade', icon: ShieldCheck },
  { id: 'accessibility', label: 'Acessibilidade', icon: Accessibility },
];

export default function SettingsPage() {
  const user = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'accessibility'>('account');
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(defaultAccessibility);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [savedAt, setSavedAt] = useState<string>('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawAccessibility = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      if (rawAccessibility) {
        const parsed = JSON.parse(rawAccessibility) as Partial<AccessibilityPreferences>;
        setAccessibility({
          highContrastEnabled: parsed.highContrastEnabled ?? defaultAccessibility.highContrastEnabled,
          darkModeEnabled: parsed.darkModeEnabled ?? defaultAccessibility.darkModeEnabled,
          textScalePercent: parsed.textScalePercent ?? defaultAccessibility.textScalePercent,
          reduceAnimations: parsed.reduceAnimations ?? defaultAccessibility.reduceAnimations,
        });
      }

      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as Partial<SettingsState>;
        setSettings({
          emailNotifications: parsed.emailNotifications ?? defaultSettings.emailNotifications,
          pushNotifications: parsed.pushNotifications ?? defaultSettings.pushNotifications,
          privateProfile: parsed.privateProfile ?? defaultSettings.privateProfile,
          twoFactorAuth: parsed.twoFactorAuth ?? defaultSettings.twoFactorAuth,
          activityDigest: parsed.activityDigest ?? defaultSettings.activityDigest,
          readReceipts: parsed.readReceipts ?? defaultSettings.readReceipts,
          showOnlineStatus: parsed.showOnlineStatus ?? defaultSettings.showOnlineStatus,
        });
      }
    } catch {
      setAccessibility(defaultAccessibility);
      setSettings(defaultSettings);
    }

    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(accessibility));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }, [accessibility, preferencesLoaded, settings]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const updateAccessibility = (key: keyof AccessibilityPreferences, value: boolean | number) => {
    setAccessibility((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateSettings = (key: keyof SettingsState, value: boolean) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const accessibilityPreviewStyle = useMemo(() => ({
    transform: `scale(${accessibility.textScalePercent / 100})`,
    transformOrigin: 'top left',
  }), [accessibility.textScalePercent]);

  const renderActiveSection = () => {
    if (activeTab === 'account') {
      return (
        <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Informações da conta</h2>
              <p className="text-sm text-slate-500">Dados base carregados do Firebase Auth e do perfil</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Nome completo</span>
              <input
                type="text"
                value={user?.displayName || ''}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleCard
              title="Autenticação de dois fatores"
              description="Aumente a segurança da conta com verificação extra"
              checked={settings.twoFactorAuth}
              onChange={(value) => updateSettings('twoFactorAuth', value)}
              icon={<Lock size={18} />}
            />
            <ToggleCard
              title="Perfil privado"
              description="Seu perfil fica visível somente para conexões aprovadas"
              checked={settings.privateProfile}
              onChange={(value) => updateSettings('privateProfile', value)}
              icon={<ShieldCheck size={18} />}
            />
            <ToggleCard
              title="Status online visível"
              description="Permite que outros vejam quando você está online"
              checked={settings.showOnlineStatus}
              onChange={(value) => updateSettings('showOnlineStatus', value)}
              icon={<PanelTopOpen size={18} />}
            />
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">Sessão</p>
            <button
              onClick={handleLogout}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-700 transition hover:bg-red-100"
            >
              <LogOut size={16} />
              Sair de todas as contas
            </button>
          </div>
        </section>
      );
    }

    if (activeTab === 'notifications') {
      return (
        <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Notificações</h2>
            <p className="text-sm text-slate-500">Mesma lógica de preferências do app desktop, persistida localmente</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ToggleCard
              title="Notificações por email"
              description="Receba alertas importantes por email"
              checked={settings.emailNotifications}
              onChange={(value) => updateSettings('emailNotifications', value)}
              icon={<Bell size={18} />}
            />
            <ToggleCard
              title="Notificações push"
              description="Receba notificações em tempo real no navegador"
              checked={settings.pushNotifications}
              onChange={(value) => updateSettings('pushNotifications', value)}
              icon={<BellRing size={18} />}
            />
            <ToggleCard
              title="Resumo diário"
              description="Um resumo consolidado das novidades do dia"
              checked={settings.activityDigest}
              onChange={(value) => updateSettings('activityDigest', value)}
              icon={<Gauge size={18} />}
            />
            <ToggleCard
              title="Confirmação de leitura"
              description="Mostre quando mensagens foram lidas"
              checked={settings.readReceipts}
              onChange={(value) => updateSettings('readReceipts', value)}
              icon={<PanelTopOpen size={18} />}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Estas preferências equivalem aos controles do desktop e ficam salvas no navegador.
          </div>
        </section>
      );
    }

    if (activeTab === 'privacy') {
      return (
        <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Privacidade</h2>
            <p className="text-sm text-slate-500">Controle o que as pessoas veem no seu perfil e na sua presença</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ToggleCard
              title="Mostrar status online"
              description="Indica quando você está online para contatos e equipes"
              checked={settings.showOnlineStatus}
              onChange={(value) => updateSettings('showOnlineStatus', value)}
              icon={<Monitor size={18} />}
            />
            <ToggleCard
              title="Perfil privado"
              description="Restringe a visibilidade do perfil para conexões aprovadas"
              checked={settings.privateProfile}
              onChange={(value) => updateSettings('privateProfile', value)}
              icon={<Lock size={18} />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard title="Dados de perfil" description="Nome, foto, curso e matrícula são os principais campos sincronizados." />
            <InfoCard title="Mídia" description="Fotos de perfil podem ser armazenadas em data URI ou via Firebase Storage." />
            <InfoCard title="Mensagens" description="Fotos e figurinhas do chat respeitam o mesmo modelo do app desktop." />
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Acessibilidade</h2>
          <p className="text-sm text-slate-500">Controles equivalentes aos ajustes salvos pelo desktop</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ToggleCard
            title="Alto contraste"
            description="Aumenta a distinção visual entre superfícies e texto"
            checked={accessibility.highContrastEnabled}
            onChange={(value) => updateAccessibility('highContrastEnabled', value)}
            icon={<Accessibility size={18} />}
          />
          <ToggleCard
            title="Modo escuro"
            description="Usa uma paleta mais escura na interface"
            checked={accessibility.darkModeEnabled}
            onChange={(value) => updateAccessibility('darkModeEnabled', value)}
            icon={<Moon size={18} />}
          />
          <ToggleCard
            title="Reduzir animações"
            description="Diminui movimentos e transições fortes"
            checked={accessibility.reduceAnimations}
            onChange={(value) => updateAccessibility('reduceAnimations', value)}
            icon={<Smartphone size={18} />}
          />
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
              <SunMedium size={18} />
              Escala de texto
            </div>
            <p className="mb-4 text-sm text-slate-500">Mesmo comportamento do desktop: de 90% a 140%</p>
            <input
              type="range"
              min={90}
              max={140}
              step={10}
              value={accessibility.textScalePercent}
              onChange={(event) => updateAccessibility('textScalePercent', Number(event.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>90%</span>
              <span className="font-semibold text-slate-900">{accessibility.textScalePercent}%</span>
              <span>140%</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-3 text-lg font-bold text-slate-900">Pré-visualização</h3>
          <div style={accessibilityPreviewStyle} className="space-y-3 origin-top-left">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Choas</p>
              <p className="text-sm text-slate-600">Ajustes aplicados localmente para seguir sua preferência.</p>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${accessibility.highContrastEnabled ? 'contrast-125' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="space-y-6">
          <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">Conta</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Configurações</h1>
                <p className="mt-1 text-sm text-slate-500">{user?.displayName || 'Usuário'} · {user?.email || ''}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:justify-end">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActive ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="min-w-0 truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Último salvamento local: {savedAt || 'agora'}</p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Preferências sincronizadas localmente
              </div>
            </div>
          </header>

          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
            {icon}
            {title}
          </div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="sr-only"
          />
          <span className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
          </span>
        </label>
      </div>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
