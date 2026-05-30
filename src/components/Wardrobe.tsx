"use client";

import { useRef } from "react";
import { clsx } from "@/lib/clsx";
import { CATEGORIES, type Garment } from "@/lib/types";

export function Wardrobe({
  garments,
  selected,
  onToggle,
  onAddFiles,
  adding = false,
  canAdd = true,
}: {
  garments: Garment[];
  selected: string[];
  onToggle: (id: string) => void;
  onAddFiles?: (files: FileList) => void;
  adding?: boolean;
  canAdd?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Botón añadir */}
      {onAddFiles && (
        <>
          <button
            onClick={() => !adding && fileInput.current?.click()}
            disabled={adding || !canAdd}
            title={canAdd ? "Añadir prenda" : "Llegaste al máximo de prendas"}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pink/50 bg-pink-soft/30 py-3 font-bold text-pink-dark transition hover:bg-pink-soft/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? (
              <>
                <span className="h-5 w-5 animate-spin-slow rounded-full border-2 border-pink-soft border-t-pink" />
                Subiendo…
              </>
            ) : (
              <>
                <span className="text-xl leading-none">＋</span> Añadir prenda
              </>
            )}
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
        </>
      )}

      {/* Secciones por categoría */}
      <div className="fancy-scroll flex-1 space-y-4 overflow-y-auto pr-1">
        {garments.length === 0 && (
          <p className="py-8 text-center text-sm text-foreground/50">
            Aún no tienes prendas. Añade algunas con el botón de arriba. 👗
          </p>
        )}

        {CATEGORIES.map((cat) => {
          const items = garments.filter((g) => g.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-pink-dark">
                <span>{cat.emoji}</span> {cat.label}
                <span className="text-xs font-normal text-foreground/40">
                  ({items.length})
                </span>
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items.map((g) => (
                  <GarmentCard
                    key={g.id}
                    garment={g}
                    selected={selected.includes(g.id)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GarmentCard({
  garment: g,
  selected: isSel,
  onToggle,
}: {
  garment: Garment;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/garment-id", g.id)}
      onClick={() => onToggle(g.id)}
      title={isSel ? "Quitar del look" : "Añadir al look"}
      className={clsx(
        "group relative aspect-square cursor-grab overflow-hidden rounded-2xl border-2 bg-white p-1 shadow transition active:cursor-grabbing",
        isSel
          ? "border-pink ring-2 ring-pink/40"
          : "border-white hover:border-pink/40",
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
        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pink text-xs text-white shadow">
          ✓
        </span>
      )}
    </button>
  );
}
