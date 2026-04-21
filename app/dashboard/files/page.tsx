'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Download, FileQuestion, Sparkles, MonitorSmartphone, Boxes } from 'lucide-react';

export default function FilesPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm lg:rounded-[2rem]">
      <div className="relative isolate flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_100%)]">
        <div className="absolute inset-0 bg-[url('/img/WIP.png')] bg-cover bg-center opacity-[0.06]" />
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[2.25rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-slate-200/60 backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                <Sparkles size={14} />
                W.I.P
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Esta tela está disponível no desktop
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                A área de arquivos ainda não foi portada para o Web com a mesma estrutura do aplicativo WPF. No desktop ela exibe a navegação completa de arquivos, bibliotecas e ativos do projeto.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <FeatureCard icon={Boxes} title="Bibliotecas" description="Pastas e recursos organizados por workspace." />
                <FeatureCard icon={FileQuestion} title="Arquivos" description="Documentos, imagens e anexos do projeto." />
                <FeatureCard icon={MonitorSmartphone} title="Desktop" description="A experiência completa continua no .NET." />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-semibold text-white shadow-lg shadow-slate-300 transition disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Download size={18} />
                  Baixe o Aplicativo para Windows aqui!!
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={18} />
                  Voltar ao painel
                </button>
              </div>

              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span>
                  Esta área segue em construção no Web. Use a versão Windows para acessar a experiência completa de arquivos.
                </span>
              </div>
            </section>

            <aside className="flex items-center justify-center rounded-[2.25rem] border border-white/70 bg-slate-950 p-4 shadow-2xl shadow-slate-200/50 sm:p-6">
              <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-black">
                <img
                  src="/img/WIP.png"
                  alt="Mascote W.I.P do Choas"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Choas Desktop</p>
                  <p className="mt-2 text-xl font-bold">Funcionalidade de arquivos disponível no aplicativo Windows</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
