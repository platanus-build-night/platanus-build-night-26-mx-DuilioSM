"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CHALLENGES,
  useChallengeProgress,
  totalStars,
  isUnlocked,
  MAX_STARS,
} from "@/lib/challenges";
import { LogoutButton } from "@/components/LogoutButton";

function StarRow({ value }: { value: number }) {
  return (
    <span className="text-lg tracking-tight">
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={i < value ? "text-pink" : "text-pink-soft"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Challenges() {
  const router = useRouter();
  const progress = useChallengeProgress();
  const earned = totalStars(progress);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 pt-safe pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-2xl font-bold text-pink-dark">
          ← Glamour Studio
        </Link>
        <LogoutButton />
      </div>

      {/* Título + contador */}
      <div className="mt-6 text-center">
        <div className="animate-float text-6xl">🗺️</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-pink-dark">
          Modo Historia
        </h1>
        <p className="mt-2 text-foreground/60">
          Supera cada nivel y consigue las <b>3 estrellas</b>. ✨
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/70 px-5 py-2 backdrop-blur">
          <span className="text-xl">⭐</span>
          <span className="font-display text-lg font-bold text-pink-dark">
            {earned} / {MAX_STARS}
          </span>
        </div>
      </div>

      {/* Timeline de niveles */}
      <div className="relative mt-10">
        {/* Línea vertical del camino */}
        <div className="absolute bottom-4 left-[27px] top-4 w-1 rounded-full bg-pink-soft" />

        <ol className="space-y-5">
          {CHALLENGES.map((ch, i) => {
            const stars = progress[ch.id]?.stars ?? 0;
            const unlocked = isUnlocked(i, progress);
            const perfect = stars >= 3;

            return (
              <li key={ch.id} className="relative flex items-stretch gap-4">
                {/* Nodo del camino */}
                <div className="z-10 flex shrink-0 flex-col items-center">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-2xl shadow-md transition ${
                      perfect
                        ? "border-yellow-300 bg-pink text-white"
                        : unlocked
                          ? "border-white bg-white"
                          : "border-white bg-pink-soft/50 grayscale"
                    }`}
                  >
                    {unlocked ? ch.emoji : "🔒"}
                  </div>
                </div>

                {/* Tarjeta del nivel */}
                <div
                  className={`flex flex-1 items-center justify-between gap-3 rounded-3xl border-2 p-4 shadow-lg backdrop-blur transition ${
                    !unlocked
                      ? "border-white/60 bg-white/40 opacity-70"
                      : stars > 0
                        ? "border-pink bg-white/80 shadow-pink/20"
                        : "border-white bg-white/70 shadow-pink/10"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-bold text-pink-dark/50">
                        NIVEL {i + 1}
                      </span>
                      {perfect && (
                        <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-bold text-pink-dark">
                          ¡PERFECTO!
                        </span>
                      )}
                    </div>
                    <h2 className="truncate font-display text-lg font-bold text-pink-dark">
                      {ch.title}
                    </h2>
                    <p className="truncate text-sm text-foreground/60">
                      {unlocked ? ch.prompt : "Completa el nivel anterior 🔒"}
                    </p>
                    <div className="mt-1">
                      <StarRow value={stars} />
                    </div>
                  </div>

                  <button
                    disabled={!unlocked}
                    onClick={() => router.push(`/play?challenge=${ch.id}`)}
                    className="shrink-0 rounded-full bg-pink px-5 py-2 font-display text-sm font-bold text-white shadow-[0_4px_0_var(--pink-dark)] transition hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_var(--pink-dark)] disabled:cursor-not-allowed disabled:bg-pink-soft disabled:text-pink-dark/50 disabled:shadow-none"
                  >
                    {!unlocked
                      ? "Bloqueado"
                      : stars > 0
                        ? perfect
                          ? "Repetir"
                          : "Mejorar →"
                        : "Jugar →"}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/play"
          className="font-semibold text-pink-dark/70 underline-offset-4 hover:underline"
        >
          🎨 Ir al Modo Libre
        </Link>
      </div>
    </main>
  );
}
