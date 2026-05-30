"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCloset } from "@/lib/store";
import { processUploadBlob, autoFrame, blobToDataURL } from "@/lib/image";
import { CATEGORIES, type Category } from "@/lib/types";
import { PrimaryButton, GhostButton, Card } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";


const STEPS = [
  { n: 1, label: "Tu foto", emoji: "📸" },
  { n: 2, label: "Tu ropa", emoji: "🧥" },
] as const;

export default function Onboarding() {
  const router = useRouter();
  const loaded = useCloset((s) => s.loaded);
  const load = useCloset((s) => s.load);
  const avatar = useCloset((s) => s.avatar);
  const garments = useCloset((s) => s.garments);
  const setAvatarBlob = useCloset((s) => s.setAvatarBlob);
  const addGarment = useCloset((s) => s.addGarment);
  const setGarmentCategory = useCloset((s) => s.setGarmentCategory);
  const removeGarment = useCloset((s) => s.removeGarment);
  const loadError = useCloset((s) => s.error);

  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const avatarInput = useRef<HTMLInputElement>(null);
  const garmentInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  // Permite abrir directo en un paso con ?step=1 (foto) o ?step=2 (ropa).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("step");
    if (s === "2") setStep(2);
    if (s === "1") setStep(1);
  }, []);

  async function onAvatarPick(files: FileList | null) {
    if (!files?.[0]) return;
    setBusy(true);
    try {
      setStatus(removeBg ? "Quitando el fondo de tu foto…" : "Procesando foto…");
      const blob = await processUploadBlob(files[0], 1024, {
        removeBg,
        onProgress: (f) =>
          setStatus(`Quitando el fondo… ${Math.round(f * 100)}%`),
      });
      setStatus("Guardando…");
      // Normalizamos el encuadre del avatar para que coincida con los looks
      // (mismo tamaño/proporción de la persona en el escenario).
      let finalBlob = blob;
      try {
        const framed = await autoFrame(await blobToDataURL(blob));
        finalBlob = await (await fetch(framed)).blob();
      } catch {
        // si falla, usamos el blob tal cual
      }
      await setAvatarBlob(finalBlob);
    } catch (e) {
      console.error(e);
      setStatus("No se pudo procesar/guardar la imagen. Intenta con otra.");
      return;
    } finally {
      setBusy(false);
    }
    setStatus(null);
  }

  async function onGarmentPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const chosen = Array.from(files);
      for (let i = 0; i < chosen.length; i++) {
        const f = chosen[i];
        setStatus(
          removeBg
            ? `Quitando fondo a la prenda ${i + 1} de ${chosen.length}…`
            : `Procesando prenda ${i + 1} de ${chosen.length}…`,
        );
        const blob = await processUploadBlob(f, 900, {
          removeBg,
          onProgress: (fr) =>
            setStatus(
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
      setStatus("No se pudieron procesar/guardar algunas prendas.");
      return;
    } finally {
      setBusy(false);
    }
    setStatus(null);
  }

  const canAdvance = step === 1 ? !!avatar : garments.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 pt-safe pb-safe">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-display text-2xl font-bold text-pink-dark"
        >
          ← Glamour Studio
        </Link>
        <LogoutButton />
      </div>

      {loadError && (
        <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠️ {loadError}
        </div>
      )}

      {/* Indicador de pasos */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {STEPS.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div key={s.n} className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 transition ${
                  active
                    ? "border-pink bg-pink text-white shadow"
                    : done
                      ? "border-pink/40 bg-pink-soft/60 text-pink-dark"
                      : "border-white bg-white/60 text-pink-dark/50"
                }`}
              >
                <span className="text-lg">{done ? "✓" : s.emoji}</span>
                <span className="text-sm font-bold">
                  Paso {s.n} — {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={`h-0.5 w-6 rounded-full ${
                    step > s.n ? "bg-pink" : "bg-pink-soft"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Toggle quitar fondo */}
      <label className="mx-auto mt-6 flex w-fit cursor-pointer items-center gap-3 rounded-full border-2 border-white bg-white/70 px-4 py-2 backdrop-blur">
        <span
          className={`relative h-6 w-11 rounded-full transition ${
            removeBg ? "bg-pink" : "bg-pink-soft"
          }`}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={removeBg}
            disabled={busy}
            onChange={(e) => setRemoveBg(e.target.checked)}
          />
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              removeBg ? "left-[1.4rem]" : "left-0.5"
            }`}
          />
        </span>
        <span className="text-sm font-semibold text-pink-dark">
          ✂️ Quitar el fondo automáticamente
        </span>
      </label>

      {/* Paso 1: avatar */}
      {step === 1 && (
        <Card className="mt-6 animate-pop">
          <h2 className="font-display text-2xl font-bold text-pink-dark">
            📸 Sube tu foto de cuerpo completo
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Usa una foto de frente, de cuerpo entero y con buena luz. Es la base
            de tu avatar.
          </p>

          <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="relative flex h-72 w-56 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-pink/50 bg-pink-soft/40">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.src}
                  alt="Tu avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-4 text-center text-sm text-pink-dark/60">
                  {loaded ? "Aún no has subido tu foto" : "Cargando…"}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <GhostButton
                disabled={busy}
                onClick={() => avatarInput.current?.click()}
              >
                {avatar ? "Cambiar foto" : "Subir foto"}
              </GhostButton>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onAvatarPick(e.target.files)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Paso 2: prendas */}
      {step === 2 && (
        <Card className="mt-6 animate-pop">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-pink-dark">
              🧥 Sube tu clóset ({garments.length})
            </h2>
            <GhostButton
              disabled={busy}
              onClick={() => garmentInput.current?.click()}
            >
              + Añadir prendas
            </GhostButton>
            <input
              ref={garmentInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => onGarmentPick(e.target.files)}
            />
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            Sube fotos de prendas individuales (mejor sobre fondo claro). Asigna
            una categoría a cada una.
          </p>

          {garments.length === 0 ? (
            <button
              onClick={() => garmentInput.current?.click()}
              disabled={busy}
              className="mt-4 flex h-40 w-full items-center justify-center rounded-3xl border-2 border-dashed border-pink/50 bg-pink-soft/30 text-pink-dark/70 transition hover:bg-pink-soft/50 disabled:opacity-50"
            >
              {loaded
                ? "Haz clic para subir tus prendas 👚👖👠"
                : "Cargando tu guardarropa…"}
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {garments.map((g) => (
                <div
                  key={g.id}
                  className="animate-pop rounded-2xl border-2 border-white bg-white p-2 shadow"
                >
                  <div className="relative h-32 overflow-hidden rounded-xl bg-pink-soft/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.src}
                      alt={g.name}
                      className="h-full w-full object-contain"
                    />
                    <button
                      onClick={() => removeGarment(g.id)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-pink-dark shadow hover:bg-pink hover:text-white"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                  <select
                    value={g.category}
                    onChange={(e) =>
                      setGarmentCategory(g.id, e.target.value as Category)
                    }
                    className="mt-2 w-full rounded-lg border border-pink/30 bg-white px-2 py-1 text-sm text-foreground"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Navegación */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {step === 2 ? (
          <GhostButton disabled={busy} onClick={() => setStep(1)}>
            ← Atrás
          </GhostButton>
        ) : (
          <span />
        )}

        {step === 1 ? (
          <PrimaryButton
            disabled={!canAdvance || busy}
            onClick={() => setStep(2)}
          >
            {busy ? "Procesando…" : "Siguiente →"}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            disabled={!canAdvance || busy}
            onClick={() => router.push("/play")}
          >
            {busy ? "Procesando…" : "¡A vestir! 👠"}
          </PrimaryButton>
        )}
      </div>

      {/* Banner de estado / progreso */}
      {status && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border-2 border-white bg-white/90 px-5 py-3 shadow-xl backdrop-blur">
            {busy && (
              <span className="h-5 w-5 animate-spin-slow rounded-full border-2 border-pink-soft border-t-pink" />
            )}
            <span className="text-sm font-semibold text-pink-dark">
              {status}
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
