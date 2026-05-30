"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCloset } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { urlToDataURL } from "@/lib/data";
import {
  processUploadBlob,
  flattenToWhite,
  resizeBlob,
  blobToDataURL,
  autoFrame,
} from "@/lib/image";

import {
  Trophy,
  TShirt,
  Heart,
  DownloadSimple,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { AvatarStage } from "@/components/AvatarStage";
import { Wardrobe } from "@/components/Wardrobe";
import { HangerRail } from "@/components/HangerRail";
import { LooksSheet } from "@/components/LooksSheet";
import { GhostButton } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import { getChallenge, evalChallenge, saveResult } from "@/lib/challenges";

// Lee ?challenge=<id> de la URL sin setState-en-effect (useSyncExternalStore).
function subscribeUrl(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
}
function readChallengeId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("challenge");
}

export default function Play() {
  const router = useRouter();
  const loaded = useCloset((s) => s.loaded);
  const loading = useCloset((s) => s.loading);
  const load = useCloset((s) => s.load);
  const avatar = useCloset((s) => s.avatar);
  const garments = useCloset((s) => s.garments);
  const selected = useCloset((s) => s.selected);
  const toggleSelect = useCloset((s) => s.toggleSelect);
  const clearSelection = useCloset((s) => s.clearSelection);
  const looks = useCloset((s) => s.looks);
  const saveLook = useCloset((s) => s.saveLook);
  const removeLook = useCloset((s) => s.removeLook);
  const addGarment = useCloset((s) => s.addGarment);
  const processPending = useCloset((s) => s.processPending);
  const syncGarments = useCloset((s) => s.syncGarments);

  const [stage, setStage] = useState<string | null>(null); // imagen mostrada
  const [deletingId, setDeletingId] = useState<string | null>(null); // look en proceso de borrado
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [looksOpen, setLooksOpen] = useState(false); // hoja de looks (mobile)

  // Reto activo (viene por ?challenge=<id>).
  const challengeId = useSyncExternalStore(
    subscribeUrl,
    readChallengeId,
    () => null,
  );
  const challenge = useMemo(
    () => (challengeId ? getChallenge(challengeId) ?? null : null),
    [challengeId],
  );
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // Procesa prendas importadas por la extensión (quita fondo + clasifica) en
  // cuanto haya alguna pendiente tras cargar el guardarropa.
  const pendingCount = garments.filter((g) => g.pending).length;
  useEffect(() => {
    if (loaded && pendingCount > 0) processPending();
  }, [loaded, pendingCount, processPending]);

  // Realtime: cuando la extensión inserta/actualiza una prenda en Supabase,
  // re-sincronizamos en vivo (RLS solo entrega filas de este usuario).
  useEffect(() => {
    if (!loaded) return;
    const supabase = createClient();
    const channel = supabase
      .channel("garments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "garments" },
        () => syncGarments(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loaded, syncGarments]);

  // Fallback sin Realtime: al volver a esta pestaña también re-sincronizamos.
  useEffect(() => {
    const onActive = () => {
      if (document.visibilityState === "visible") syncGarments();
    };
    document.addEventListener("visibilitychange", onActive);
    window.addEventListener("focus", onActive);
    return () => {
      document.removeEventListener("visibilitychange", onActive);
      window.removeEventListener("focus", onActive);
    };
  }, [syncGarments]);

  // Redirige a onboarding si falta configuración (tras cargar).
  useEffect(() => {
    if (loaded && (!avatar || garments.length === 0)) {
      router.replace("/onboarding");
    }
  }, [loaded, avatar, garments.length, router]);

  const selectedGarments = useMemo(
    () => garments.filter((g) => selected.includes(g.id)),
    [garments, selected],
  );

  // Evaluación del reto en vivo (sin IA): se recalcula con cada cambio.
  const challengeEval = useMemo(
    () => (challenge ? evalChallenge(challenge, selectedGarments) : null),
    [challenge, selectedGarments],
  );

  // Estrellas ganadas en vivo (0-3). Detectamos el flanco "ganó más estrellas"
  // durante el render (patrón recomendado: ajustar estado en render, no en effect).
  const earnedStars = challengeEval?.stars ?? 0;
  const [prevStars, setPrevStars] = useState(0);
  if (earnedStars !== prevStars) {
    const increased = earnedStars > prevStars;
    setPrevStars(earnedStars);
    // Celebra al superar el nivel (1ª estrella) o al conseguir las 3.
    if (increased && (prevStars === 0 || earnedStars === 3)) setCelebrate(true);
  }

  // Persistir el mejor resultado (localStorage), sin setState.
  useEffect(() => {
    if (challenge && earnedStars > 0) saveResult(challenge.id, earnedStars);
  }, [challenge, earnedStars]);

  // Clave del combo ya generado (para no repetir) + ref para el debounce.
  const lastGenKey = useRef<string>("");

  const keyOf = (ids: string[]) => ids.slice().sort().join(",");

  const generate = useCallback(async () => {
    const sel = useCloset.getState().selected;
    const selGarments = garments.filter((g) => sel.includes(g.id));
    if (!avatar || selGarments.length === 0) return;
    const key = keyOf(sel);

    setGenerating(true);
    setError(null);
    try {
      // Las imágenes viven en Storage (URL firmada) -> a data URL para la IA.
      // Las aplanamos sobre BLANCO para que la IA reciba un fondo blanco
      // explícito (evita que interprete la transparencia como negro) y así el
      // fondo del resultado sea siempre blanco consistente.
      const [avatarData, garmentDatas] = await Promise.all([
        urlToDataURL(avatar.src).then(flattenToWhite),
        Promise.all(
          selGarments.map((g) => urlToDataURL(g.src).then(flattenToWhite)),
        ),
      ]);

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: avatarData,
          garments: selGarments.map((g, i) => ({
            src: garmentDatas[i],
            category: g.category,
            name: g.name,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar el look");

      // Normalizamos el encuadre (la persona siempre al mismo tamaño) y de paso
      // comprimimos a WebP. Si falla, caemos a una compresión simple.
      let lookImage = data.image as string;
      try {
        lookImage = await autoFrame(data.image);
      } catch (cmpErr) {
        console.warn("[look] autoFrame falló, comprimo simple:", cmpErr);
        try {
          const blob = await (await fetch(data.image)).blob();
          lookImage = await blobToDataURL(await resizeBlob(blob, 1024));
        } catch {}
      }

      const look = await saveLook(
        lookImage,
        selGarments.map((g) => g.id),
      );
      setStage(look.src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal");
    } finally {
      // Marcamos el combo como procesado aunque falle, para no reintentar en bucle.
      lastGenKey.current = key;
      setGenerating(false);
    }
  }, [avatar, garments, saveLook]);

  // Auto-genera cuando cambia la selección (con debounce). Si ya está
  // generando, espera a que termine y vuelve a evaluar con la última selección.
  useEffect(() => {
    if (!avatar) return;

    // Sin prendas -> vuelve a la foto original.
    if (selected.length === 0) {
      lastGenKey.current = "";
      setStage(avatar.src);
      return;
    }

    if (generating) return; // se re-evalúa cuando 'generating' pase a false
    if (keyOf(selected) === lastGenKey.current) return; // ya generado

    const t = setTimeout(() => generate(), 500);
    return () => clearTimeout(t);
  }, [selected, generating, avatar, generate]);

  // Borra un look con animación: marca "eliminando" (overlay) y el borrado es
  // optimista en el store, así la salida es suave y no se queda colgado.
  const handleRemoveLook = useCallback(
    async (id: string) => {
      if (deletingId) return;
      setDeletingId(id);
      try {
        await removeLook(id);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, removeLook],
  );

  // Al soltar una prenda sobre el avatar: añadir (sin quitar) -> dispara auto-gen.
  const onDrop = useCallback(
    (id: string) => {
      if (!useCloset.getState().selected.includes(id)) toggleSelect(id);
    },
    [toggleSelect],
  );

  // Añadir prendas nuevas desde el guardarropa (quita fondo + sube a Storage).
  const onAddFiles = useCallback(
    async (files: FileList) => {
      const chosen = Array.from(files);
      if (chosen.length === 0) return;
      setAdding(true);
      try {
        for (let i = 0; i < chosen.length; i++) {
          const f = chosen[i];
          setAddStatus(`Quitando fondo a la prenda ${i + 1}/${chosen.length}…`);
          const blob = await processUploadBlob(f, 900, {
            removeBg: true,
            onProgress: (fr) =>
              setAddStatus(
                `Prenda ${i + 1}/${chosen.length} — quitando fondo ${Math.round(
                  fr * 100,
                )}%`,
              ),
          });
          const name = f.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Prenda";
          await addGarment(blob, "other", name);
        }
      } catch (e) {
        console.error(e);
        setAddStatus("No se pudo subir alguna prenda.");
        setTimeout(() => setAddStatus(null), 3000);
        return;
      } finally {
        setAdding(false);
      }
      setAddStatus(null);
    },
    [addGarment],
  );

  if (!loaded) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin-slow rounded-full border-4 border-pink-soft border-t-pink" />
      </main>
    );
  }

  return (
    <>
      {/* ===================== MOBILE · Probador ===================== */}
      <div className="flex h-[100dvh] flex-col lg:hidden">
        {/* Header compacto */}
        <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-safe">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-display text-lg font-extrabold text-pink-dark"
          >
            <span className="text-xl">👗</span> Glamour
          </Link>
          <div className="flex items-center gap-1.5">
            {looks.length > 0 && (
              <button
                onClick={() => setLooksOpen(true)}
                aria-label="Mis looks"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-pink/20 bg-white/80 text-pink-dark shadow-sm transition active:scale-90"
              >
                <Heart weight="fill" className="text-pink" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
                  {looks.length}
                </span>
              </button>
            )}
            <Link
              href="/challenges"
              aria-label="Retos"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-pink/20 bg-white/80 text-pink-dark shadow-sm transition active:scale-90"
            >
              <Trophy weight="fill" className="text-gold" />
            </Link>
            <Link
              href="/onboarding?step=2"
              aria-label="Mi guardarropa"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-pink/20 bg-white/80 text-pink-dark shadow-sm transition active:scale-90"
            >
              <TShirt weight="bold" />
            </Link>
            <LogoutButton iconOnly />
          </div>
        </header>

        {/* Banner compacto del reto activo */}
        {challenge && challengeEval && (
          <Link
            href="/challenges"
            className={`mx-4 mb-1 flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2 backdrop-blur transition ${
              challengeEval.complete
                ? "border-pink bg-pink-soft/50"
                : "border-pink/15 bg-white/70"
            }`}
          >
            <span className="text-2xl">{challenge.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-pink-dark">
                {challenge.title}
              </p>
              <p className="truncate text-[11px] text-foreground/55">
                {challengeEval.tiers.find((t) => !t.done)?.label ??
                  "¡Las 3 estrellas! 🎉"}
              </p>
            </div>
            <span className="shrink-0 text-sm tracking-tight">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    i < challengeEval.stars ? "text-gold" : "text-pink-soft"
                  }
                >
                  ★
                </span>
              ))}
            </span>
          </Link>
        )}

        {/* Espejo: llena el alto disponible */}
        <div className="relative min-h-0 flex-1 px-4 pt-1">
          <AvatarStage
            image={stage}
            loading={generating}
            onDropGarment={onDrop}
            fill
          >
            {error && (
              <div className="absolute inset-x-3 top-3 rounded-xl bg-red-50/95 px-3 py-2 text-center text-xs font-semibold text-red-600 shadow">
                {error}
              </div>
            )}
            {stage && stage !== avatar?.src && !generating && (
              <div className="absolute right-3 top-3 flex flex-col gap-2">
                <a
                  href={stage}
                  download="glamour-look.png"
                  aria-label="Descargar look"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-pink/20 bg-white/90 text-pink-dark shadow transition active:scale-90"
                >
                  <DownloadSimple weight="bold" />
                </a>
                <button
                  onClick={() => avatar && setStage(avatar.src)}
                  aria-label="Ver foto original"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-pink/20 bg-white/90 text-pink-dark shadow transition active:scale-90"
                >
                  <ArrowCounterClockwise weight="bold" />
                </button>
              </div>
            )}
          </AvatarStage>
        </div>

        {/* Llevas puesto */}
        <div className="px-4 py-2">
          {selectedGarments.length === 0 ? (
            <p className="text-center text-xs font-semibold text-pink-dark/55">
              Toca una prenda del riel para vestir tu avatar ✨
            </p>
          ) : (
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-pink-dark/50">
                Llevas
              </span>
              {selectedGarments.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleSelect(g.id)}
                  aria-label={`Quitar ${g.name}`}
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 border-pink/30 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.src}
                    alt={g.name}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink text-[9px] font-bold text-white shadow">
                    ✕
                  </span>
                </button>
              ))}
              <button
                onClick={clearSelection}
                className="shrink-0 rounded-full border-2 border-pink/20 px-3 py-1 text-[11px] font-bold text-pink-dark/70"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Riel de perchas (firma) */}
        <HangerRail
          garments={garments}
          selected={selected}
          onToggle={toggleSelect}
          onAddFiles={onAddFiles}
          adding={adding}
        />
      </div>

      {/* ===================== DESKTOP ===================== */}
      <main className="mx-auto hidden w-full max-w-6xl flex-1 px-4 py-5 lg:block">
        {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-2xl font-bold text-pink-dark">
          👗 Glamour Studio
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/challenges">
            <GhostButton>🏆 Retos</GhostButton>
          </Link>
          <Link href="/onboarding?step=2">
            <GhostButton>Mi guardarropa</GhostButton>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Banner del reto activo */}
      {challenge && challengeEval && (
        <div
          className={`mt-4 rounded-3xl border-2 p-4 shadow-lg backdrop-blur transition ${
            challengeEval.complete
              ? "border-pink bg-pink-soft/50 shadow-pink/20"
              : "border-white bg-white/70 shadow-pink/10"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{challenge.emoji}</span>
              <div>
                <h2 className="font-display text-lg font-bold text-pink-dark">
                  Reto: {challenge.title}
                </h2>
                <p className="text-sm text-foreground/60">{challenge.prompt}</p>
              </div>
            </div>
            <Link
              href="/challenges"
              className="shrink-0 text-xs font-semibold text-pink-dark/60 hover:text-pink-dark"
            >
              Cambiar reto
            </Link>
          </div>

          {/* Metas por estrella (en vivo) */}
          <div className="mt-3 space-y-1.5">
            {challengeEval.tiers.map((t) => (
              <div
                key={t.star}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  t.done
                    ? "bg-pink text-white"
                    : "bg-white/70 text-pink-dark/70"
                }`}
              >
                <span className="tracking-tight">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < t.star
                          ? t.done
                            ? "text-yellow-200"
                            : "text-pink"
                          : "opacity-30"
                      }
                    >
                      ★
                    </span>
                  ))}
                </span>
                <span className="flex-1">{t.label}</span>
                {t.done && <span>✓</span>}
              </div>
            ))}
            <p className="pt-1 text-center font-display text-sm font-bold text-pink-dark">
              {challengeEval.stars} / 3 estrellas
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Columna izquierda: escenario */}
        <section>
          <AvatarStage
            image={stage}
            loading={generating}
            onDropGarment={onDrop}
          />

          {/* Editar la persona / avatar */}
          <div className="mt-3 flex justify-center">
            <Link href="/onboarding?step=1">
              <GhostButton>🧍 Cambiar mi foto</GhostButton>
            </Link>
          </div>

          {/* Bandeja de seleccionadas */}
          <div className="mt-4 rounded-3xl border-2 border-white bg-white/70 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-pink-dark">
                Outfit seleccionado ({selectedGarments.length})
                {generating && (
                  <span className="ml-2 text-xs font-normal text-lilac">
                    generando…
                  </span>
                )}
              </h3>
              {selectedGarments.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs font-semibold text-pink-dark/60 hover:text-pink-dark"
                >
                  Limpiar
                </button>
              )}
            </div>

            {selectedGarments.length === 0 ? (
              <p className="mt-2 text-sm text-foreground/50">
                Arrastra prendas a tu avatar (o tócalas) y tu look se genera
                solo. ✨
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedGarments.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleSelect(g.id)}
                      title="Quitar del look"
                      aria-label={`Quitar ${g.name} del look`}
                      className="group relative h-16 w-16 overflow-hidden rounded-xl border-2 border-pink/30 bg-white transition hover:border-pink"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.src}
                        alt={g.name}
                        className="h-full w-full object-contain transition group-hover:opacity-40"
                      />
                      {/* Badge de quitar siempre visible */}
                      <span className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white shadow">
                        ✕
                      </span>
                      {/* Capa "Quitar" al pasar el cursor */}
                      <span className="absolute inset-0 flex items-center justify-center bg-pink/0 text-[11px] font-bold text-pink-dark opacity-0 transition group-hover:bg-white/70 group-hover:opacity-100">
                        Quitar
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Toca una prenda de arriba para quitarla del look. ✕
                </p>
              </>
            )}

            {error && (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {stage && stage !== avatar?.src && (
              <div className="mt-3 flex gap-2">
                <a
                  href={stage}
                  download={`look-${Date.now()}.png`}
                  className="flex-1 rounded-full border-2 border-pink/40 bg-white px-4 py-2 text-center text-sm font-semibold text-pink-dark hover:border-pink"
                >
                  ⬇️ Descargar
                </a>
                <button
                  onClick={() => avatar && setStage(avatar.src)}
                  className="flex-1 rounded-full border-2 border-pink/40 bg-white px-4 py-2 text-sm font-semibold text-pink-dark hover:border-pink"
                >
                  ↺ Ver original
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Columna derecha: guardarropa */}
        <section className="flex min-h-[28rem] flex-col rounded-3xl border-2 border-white bg-white/60 p-4 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold text-pink-dark">
              👚 Tu guardarropa
            </h2>
            <span className="text-xs text-foreground/50">
              {garments.length} prendas
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <Wardrobe
              garments={garments}
              selected={selected}
              onToggle={toggleSelect}
              onAddFiles={onAddFiles}
              adding={adding}
            />
          </div>
        </section>
      </div>

      {/* Galería de looks generados */}
      {looks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-pink-dark">
            💖 Tus looks {loading && "…"}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            <AnimatePresence mode="popLayout">
              {looks.map((l) => {
                const isDeleting = deletingId === l.id;
                return (
                  <motion.div
                    key={l.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white bg-white shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={l.src}
                      alt="Look"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full cursor-pointer object-cover"
                      onClick={() => !isDeleting && setStage(l.src)}
                    />
                    <button
                      onClick={() => handleRemoveLook(l.id)}
                      disabled={isDeleting}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-pink-dark opacity-0 shadow transition group-hover:opacity-100 hover:bg-pink hover:text-white disabled:opacity-0"
                      aria-label="Eliminar look"
                    >
                      ✕
                    </button>

                    {/* Overlay "eliminando…" mientras se borra. */}
                    <AnimatePresence>
                      {isDeleting && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-pink-dark/35 backdrop-blur-[2px]"
                        >
                          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-white drop-shadow">
                            Eliminando…
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}
      </main>

      {/* Celebración al completar un reto */}
      {celebrate && challenge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pink-dark/40 px-4 backdrop-blur-sm"
          onClick={() => setCelebrate(false)}
        >
          <div
            className="animate-pop w-full max-w-sm rounded-[2rem] border-4 border-white bg-white p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="animate-float text-6xl">{challenge.emoji}</div>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-pink-dark">
              {earnedStars >= 3 ? "¡Perfecto! 3 estrellas" : "¡Nivel superado!"}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">{challenge.title}</p>
            <div className="mt-3 text-4xl tracking-widest">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={i < earnedStars ? "text-pink" : "text-pink-soft"}
                >
                  ★
                </span>
              ))}
            </div>
            <p className="mt-1 text-sm font-semibold text-pink-dark">
              {earnedStars >= 3
                ? "¡Lo lograste! 🎉"
                : "¿Puedes llegar a las 3 estrellas?"}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => setCelebrate(false)}
                className="rounded-full bg-pink px-6 py-3 font-display text-lg font-bold text-white shadow-[0_5px_0_var(--pink-dark)] transition active:translate-y-0.5 active:shadow-[0_2px_0_var(--pink-dark)] hover:brightness-105"
              >
                ¡Genial! Seguir aquí
              </button>
              <button
                onClick={() => router.push("/challenges")}
                className="rounded-full border-2 border-pink/40 bg-white px-6 py-2 font-semibold text-pink-dark transition hover:border-pink"
              >
                🏆 Otro reto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de estado al añadir prendas */}
      {addStatus && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border-2 border-white bg-white/90 px-5 py-3 shadow-xl backdrop-blur">
            {adding && (
              <span className="h-5 w-5 animate-spin-slow rounded-full border-2 border-pink-soft border-t-pink" />
            )}
            <span className="text-sm font-semibold text-pink-dark">
              {addStatus}
            </span>
          </div>
        </div>
      )}

      {/* Hoja de looks (mobile) */}
      <LooksSheet
        open={looksOpen}
        looks={looks}
        deletingId={deletingId}
        onClose={() => setLooksOpen(false)}
        onSelect={(src) => setStage(src)}
        onRemove={handleRemoveLook}
      />
    </>
  );
}
