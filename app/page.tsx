'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

const floatingChaoCharacters = [
  {
    src: '/img/WebChars/DarkChao_0.png',
    alt: 'Dark Chao',
    className: 'left-[24%] top-[0.75rem] w-[6.5rem] sm:left-[18%] sm:w-[8rem] lg:left-[-3rem] lg:top-[0.5rem] lg:w-[11rem] animate-[floatDark_8s_ease-in-out_infinite]',
    glow: 'rgba(236,72,153,0.55)',
    delay: '0s',
  },
  {
    src: '/img/WebChars/HeroChao_0.png',
    alt: 'Hero Chao',
    className: 'right-[24%] top-[0.25rem] w-[6.25rem] sm:right-[18%] sm:w-[7.5rem] lg:right-[-2.5rem] lg:w-[10.5rem] animate-[floatHero_7s_ease-in-out_infinite]',
    glow: 'rgba(250,204,21,0.62)',
    delay: '0.9s',
  },
  {
    src: '/img/WebChars/NeutralChao_0.png',
    alt: 'Neutral Chao',
    className: 'bottom-[0.1rem] left-1/2 w-[6.5rem] -translate-x-1/2 sm:w-[7.5rem] lg:bottom-[-2.5rem] lg:w-[10rem] animate-[floatNeutral_9s_ease-in-out_infinite]',
    glow: 'rgba(96,165,250,0.58)',
    delay: '1.6s',
  },
] as const;

export default function Home() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/dashboard');
      } else {
        setShowContent(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!showContent) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden pb-16 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_20%)]" />
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: 'url(/img/Hero_0.png)' }} />
        <div className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
            <div className="mx-auto max-w-2xl text-center xl:mx-0 xl:text-left">
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200 ring-1 ring-white/10 backdrop-blur sm:text-sm">
                Observatório Acadêmico
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Choas
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-8 xl:mx-0 xl:text-xl">
                Observatório de Projetos Integradores para equipes, turmas e orientadores. Um workspace acadêmico moderno para gerenciar entregas, comunicação e progresso com clareza.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center xl:justify-start">
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
                >
                  Conheça o Choas
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:bg-slate-800/80"
                >
                  Entrar na plataforma
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
                <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur sm:p-5">
                  <p className="text-2xl font-semibold text-white">+4x</p>
                  <p className="mt-2 text-sm text-slate-400">Produtividade acadêmica</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur sm:p-5">
                  <p className="text-2xl font-semibold text-white">+120</p>
                  <p className="mt-2 text-sm text-slate-400">Projetos integradores monitorados</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur sm:p-5">
                  <p className="text-2xl font-semibold text-white">100%</p>
                  <p className="mt-2 text-sm text-slate-400">Foco em times e entrega colaborativa</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto h-[19rem] w-full max-w-[22rem] overflow-visible sm:h-[24rem] sm:max-w-[26rem] lg:h-[34rem] lg:max-w-none">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.10),_transparent_58%)] blur-2xl sm:rounded-[2.5rem] lg:rounded-[3rem] lg:bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.10),_transparent_46%)]" />
              <div className="absolute left-[22%] top-[18%] h-16 w-16 rounded-full bg-cyan-400/18 blur-3xl sm:h-32 sm:w-32 lg:left-[12%] lg:h-40 lg:w-40" />
              <div className="absolute right-[22%] top-[20%] h-18 w-18 rounded-full bg-fuchsia-500/16 blur-3xl sm:h-36 sm:w-36 lg:right-[8%] lg:h-48 lg:w-48" />
              <div className="absolute bottom-[10%] left-1/2 h-14 w-14 -translate-x-1/2 rounded-full bg-amber-400/16 blur-3xl sm:h-28 sm:w-28 lg:left-[30%] lg:h-36 lg:w-36 lg:translate-x-0" />

              {floatingChaoCharacters.map((character) => (
                <div
                  key={character.alt}
                  className={`absolute ${character.className} pointer-events-none select-none`}
                  style={{ animationDelay: character.delay }}
                >
                  <div
                    className="absolute inset-0 scale-[0.78] rounded-full blur-3xl"
                    style={{ background: character.glow, opacity: 0.75 }}
                  />
                  <img
                    src={character.src}
                    alt={character.alt}
                    className="relative z-10 h-auto w-full drop-shadow-[0_0_24px_rgba(255,255,255,0.24)] drop-shadow-[0_0_42px_rgba(255,255,255,0.10)]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Recursos</p>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Visual elegante, controle acadêmico real.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Inspirado no desktop Choas, o landing page agora reflete design sofisticado, clareza de informação e a experiência de gestão de projetos integradores.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20 backdrop-blur">
            <p className="text-3xl">📚</p>
            <h3 className="mt-6 text-xl font-semibold text-white">Gestão acadêmica</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Centralize turmas, matrículas e entregas com a mesma disciplina de fluxo do Choas desktop.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20 backdrop-blur">
            <p className="text-3xl">🤝</p>
            <h3 className="mt-6 text-xl font-semibold text-white">Equipes e colaboração</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Pingue seu time, compartilhe arquivos e mantenha o contexto do projeto em um painel único.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20 backdrop-blur">
            <p className="text-3xl">🧠</p>
            <h3 className="mt-6 text-xl font-semibold text-white">Insights e status</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Acompanhe risco acadêmico, progresso e entrega com indicadores práticos e visuais.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20 backdrop-blur">
            <p className="text-3xl">🚀</p>
            <h3 className="mt-6 text-xl font-semibold text-white">Interface moderna</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Tela limpa, tipografia forte e componentes que combinam com o estilo do app desktop Choas.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300 sm:text-sm">Entre em contato</p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl sm:leading-tight lg:text-4xl">
                Conecte-se com o Choas.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Tem dúvidas sobre o projeto? Quer colaborar ou precisa de suporte? Entre em contato conosco através dos canais abaixo.
              </p>
              <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
                <a
                  href="mailto:Joelyson.silva5008712@edu.pe.senac.br"
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 hover:border-cyan-300 sm:p-4"
                >
                  <span className="flex-shrink-0 text-xl sm:text-2xl">✉️</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 sm:text-xs">Email</p>
                    <p className="break-words text-sm font-semibold leading-5 text-white sm:text-base sm:leading-6">Joelyson.silva5008712@edu.pe.senac.br</p>
                  </div>
                </a>
                <a
                  href="https://wa.me/5581988872515"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 hover:border-green-400 sm:p-4"
                >
                  <span className="flex-shrink-0 text-xl sm:text-2xl">💬</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 sm:text-xs">WhatsApp</p>
                    <p className="break-words text-sm font-semibold leading-5 text-white sm:text-base sm:leading-6">(81) 9 8887-2515</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:gap-4">
              <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:p-6">
                <p className="text-xs text-slate-400 sm:text-sm">Plataforma</p>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-white sm:text-base">Choas | Observatório de Projetos Integradores</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:p-6">
                <p className="text-xs text-slate-400 sm:text-sm">Suporte</p>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-white sm:text-base">Disponível via email e WhatsApp para dúvidas rápidas.</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:p-6">
                <p className="text-xs text-slate-400 sm:text-sm">Comunidade</p>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-white sm:text-base">Faça parte de um workspace focado em entrega e produtividade.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes floatDark {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
          50% { transform: translate3d(0, -16px, 0) rotate(2deg); }
        }

        @keyframes floatHero {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(2deg); }
          50% { transform: translate3d(0, -18px, 0) rotate(-3deg); }
        }

        @keyframes floatNeutral {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(0, -14px, 0) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}
