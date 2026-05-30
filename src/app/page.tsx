"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  PaintBrush,
  MapTrifold,
  SignIn,
  SignOut,
  Star,
  Sparkle,
  CaretRight,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useCloset } from "@/lib/store";
import { GhostButton } from "@/components/ui";
import {
  useChallengeProgress,
  totalStars,
  MAX_STARS,
} from "@/lib/challenges";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState<string>("");
  const reset = useCloset((s) => s.reset);
  const progress = useChallengeProgress();
  const stars = totalStars(progress);
  const reduce = useReducedMotion();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setAuthed(!!u);
      if (u)
        setName(
          ((u.user_metadata?.name as string | undefined) || u.email) ??
            "Mi perfil",
        );
    });
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    reset();
    setAuthed(false);
    setName("");
  }

  const rise = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Barra superior: perfil / sesión */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 pt-safe">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold text-pink-dark">
          <Sparkle weight="fill" className="text-pink" /> Glamour Studio
        </span>
        <div className="h-9">
          {authed === true && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full border-2 border-white bg-surface/80 px-3 py-1.5 text-sm font-semibold text-pink-dark backdrop-blur">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-[#ff6aa9] to-pink text-xs text-white">
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[12rem] truncate sm:inline">
                  {name}
                </span>
              </span>
              <GhostButton onClick={logout}>
                <SignOut weight="bold" /> Salir
              </GhostButton>
            </div>
          )}
          {authed === false && (
            <Link href="/login">
              <GhostButton>
                <SignIn weight="bold" /> Iniciar sesión
              </GhostButton>
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pb-16 pb-safe text-center">
        {/* Lockup de marca */}
        <motion.div {...rise(0)} className="flex flex-col items-center">
          <span className="animate-float text-7xl drop-shadow-[0_10px_20px_rgba(216,39,111,0.25)]">
            👗
          </span>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-pink-dark drop-shadow-sm sm:text-7xl">
            Glamour Studio
          </h1>
          <p className="mt-3 max-w-md text-lg text-muted">
            Viste tu avatar con tu ropa real y deja que la IA cree tu look.
          </p>
        </motion.div>

        {/* Invitado */}
        {authed === false && (
          <motion.div {...rise(0.1)} className="mt-9 flex flex-col items-center gap-3">
            <Link href="/login">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#ff6aa9] to-pink px-8 py-4 font-display text-xl font-bold text-white shadow-[0_6px_0_var(--pink-dark)] transition active:translate-y-1 active:shadow-[0_2px_0_var(--pink-dark)]">
                Empezar <Sparkle weight="fill" />
              </span>
            </Link>
          </motion.div>
        )}

        {/* Con sesión: menú de modos */}
        {authed === true && (
          <div className="mt-10 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
            <ModeCard
              {...rise(0.08)}
              href="/play"
              icon={<PaintBrush weight="fill" />}
              tone="pink"
              title="Modo Libre"
              desc="Crea sin límites. Viste tu avatar como quieras y guarda tus looks."
              cta="Jugar libre"
            />
            <ModeCard
              {...rise(0.16)}
              href="/challenges"
              icon={<MapTrifold weight="fill" />}
              tone="grape"
              title="Modo Historia"
              desc="Supera niveles de outfit y consigue las 3 estrellas de cada uno."
              cta="Ver niveles"
              badge={
                <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1 text-sm font-bold text-pink-dark shadow-sm">
                  <Star weight="fill" className="text-gold" /> {stars} / {MAX_STARS}
                </span>
              }
            />
          </div>
        )}

        {authed === null && (
          <div className="mt-12 h-10 w-10 animate-spin-slow rounded-full border-4 border-pink-soft border-t-pink" />
        )}

        {/* Pasos (invitado) */}
        {authed === false && (
          <motion.div
            {...rise(0.2)}
            className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {[
              { e: "📸", t: "Tu foto", d: "Una foto de cuerpo completo" },
              { e: "🧥", t: "Tu ropa", d: "Hasta 10 prendas reales" },
              { e: "🪄", t: "¡Vístete!", d: "Arrastra y genera con IA" },
            ].map((s) => (
              <div
                key={s.t}
                className="rounded-[var(--radius-lg)] border border-white/80 bg-surface/70 p-5 shadow-[var(--shadow-card)] backdrop-blur"
              >
                <div className="text-4xl">{s.e}</div>
                <div className="mt-2 font-display text-lg font-bold text-pink-dark">
                  {s.t}
                </div>
                <div className="text-sm text-muted">{s.d}</div>
              </div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

function ModeCard({
  href,
  icon,
  title,
  desc,
  cta,
  tone,
  badge,
  ...motionProps
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
  cta: string;
  tone: "pink" | "grape";
  badge?: ReactNode;
} & Record<string, unknown>) {
  const ring =
    tone === "pink"
      ? "from-pink-soft/80 to-surface"
      : "from-[#ece0ff] to-surface";
  const chip = tone === "pink" ? "bg-pink text-white" : "bg-grape text-white";
  return (
    <motion.div {...motionProps}>
      <Link
        href={href}
        className={`group flex h-full flex-col items-center rounded-[var(--radius-lg)] border-2 border-white bg-gradient-to-b ${ring} p-7 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)]`}
      >
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-md transition group-hover:scale-110 ${chip}`}
        >
          {icon}
        </span>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-pink-dark">
          {title}
        </h2>
        {badge && <div className="mt-2">{badge}</div>}
        <p className="mt-2 flex-1 text-sm text-muted">{desc}</p>
        <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#ff6aa9] to-pink px-6 py-3 font-display text-lg font-bold text-white shadow-[0_5px_0_var(--pink-dark)] transition group-active:translate-y-0.5 group-active:shadow-[0_2px_0_var(--pink-dark)]">
          {cta} <CaretRight weight="bold" />
        </span>
      </Link>
    </motion.div>
  );
}
