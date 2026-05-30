"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, SpinnerGap } from "@phosphor-icons/react";
import { clsx } from "@/lib/clsx";
import { CATEGORIES, type Category, type Garment } from "@/lib/types";

/**
 * Riel de perchas (mobile). La firma del probador: la ropa cuelga de ganchos
 * sobre un riel que deslizas en horizontal. Tocar una prenda la pone/quita y
 * dispara la generación automática del look. Se ancla al fondo del viewport.
 */
export function HangerRail({
  garments,
  selected,
  onToggle,
  onAddFiles,
  adding = false,
}: {
  garments: Garment[];
  selected: string[];
  onToggle: (id: string) => void;
  onAddFiles?: (files: FileList) => void;
  adding?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState<Category | "all">("all");

  // Solo mostramos pestañas de categorías que tienen prendas.
  const tabs = useMemo(() => {
    const present = CATEGORIES.filter((c) =>
      garments.some((g) => g.category === c.id),
    );
    return [{ id: "all" as const, label: "Todas", emoji: "✨" }, ...present];
  }, [garments]);

  const shown = useMemo(
    () => (cat === "all" ? garments : garments.filter((g) => g.category === cat)),
    [garments, cat],
  );

  return (
    <div className="rounded-t-[1.75rem] border-t-2 border-white bg-white/85 px-3 pt-3 shadow-[0_-10px_30px_-18px_rgba(216,39,111,0.4)] backdrop-blur pb-safe">
      {/* Tirador (afordancia de panel) */}
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-pink-soft" />

      {/* Pestañas de categoría */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {tabs.map((t) => {
          const active = cat === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCat(t.id)}
              className={clsx(
                "flex shrink-0 items-center gap-1 rounded-full border-2 px-3 py-1.5 text-sm font-bold transition",
                active
                  ? "border-pink bg-pink text-white shadow-sm"
                  : "border-pink/15 bg-white/70 text-pink-dark/70 hover:border-pink/40",
              )}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Riel: línea + perchas que cuelgan */}
      <div className="rail-line no-scrollbar flex items-start gap-3 overflow-x-auto px-1 pb-1">
        {/* Añadir prenda (cuelga como una percha más) */}
        {onAddFiles && (
          <div className="hanger shrink-0">
            <button
              onClick={() => !adding && fileInput.current?.click()}
              disabled={adding}
              aria-label="Añadir prenda"
              className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-pink/50 bg-pink-soft/30 text-pink-dark transition active:scale-95 disabled:opacity-50"
            >
              {adding ? (
                <SpinnerGap weight="bold" className="h-5 w-5 animate-spin-slow" />
              ) : (
                <Plus weight="bold" className="h-5 w-5" />
              )}
              <span className="text-[10px] font-bold leading-none">
                {adding ? "Subiendo" : "Añadir"}
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) onAddFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {shown.length === 0 && (
          <p className="hanger px-2 py-4 text-sm text-foreground/50">
            Aún no hay prendas en esta categoría.
          </p>
        )}

        {shown.map((g) => {
          const isSel = selected.includes(g.id);
          return (
            <div key={g.id} className={clsx("hanger shrink-0", isSel && "is-on")}>
              <button
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/garment-id", g.id)
                }
                onClick={() => onToggle(g.id)}
                title={isSel ? "Quitar del look" : "Poner en el look"}
                className={clsx(
                  "relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl border-2 bg-white p-1 transition active:scale-95",
                  isSel
                    ? "border-pink shadow-[0_6px_16px_-8px_rgba(216,39,111,0.7)] ring-2 ring-pink/30"
                    : "border-white shadow-sm",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.src}
                  alt={g.name}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full rounded-xl object-contain"
                />
                {isSel && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white shadow">
                    ✓
                  </span>
                )}
                {g.pending && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-white/70 backdrop-blur-[1px]">
                    <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-pink-soft border-t-pink" />
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
