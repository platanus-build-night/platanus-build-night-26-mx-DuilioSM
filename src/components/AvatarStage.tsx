"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "@/lib/clsx";

export function AvatarStage({
  image,
  loading,
  onDropGarment,
  fill = false,
  className,
  children,
}: {
  image: string | null;
  loading: boolean;
  onDropGarment: (id: string) => void;
  /** Llena la altura disponible (probador mobile) en vez de usar aspecto fijo. */
  fill?: boolean;
  className?: string;
  /** Superposiciones del escenario (chips de "llevas puesto", acciones…). */
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/garment-id");
        if (id) onDropGarment(id);
      }}
      className={clsx(
        "relative flex items-center justify-center overflow-hidden rounded-[2rem] border-4 bg-white transition",
        fill
          ? "h-full w-full shadow-[var(--shadow-card)]"
          : "mx-auto aspect-[3/4] w-full max-w-sm shadow-xl",
        over
          ? "scale-[1.02] border-lilac ring-4 ring-lilac/30"
          : "border-white",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt="Avatar"
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="px-6 text-center text-pink-dark/60">
          Tu avatar aparecerá aquí
        </span>
      )}

      {/* Pista de drop */}
      {over && !loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-lilac/10 font-display text-2xl font-bold text-lilac">
          Suéltalo aquí ✨
        </div>
      )}

      {/* Overlay de carga */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin-slow rounded-full border-4 border-pink-soft border-t-pink" />
          <p className="font-display text-lg font-bold text-pink-dark">
            Creando tu look…
          </p>
          <p className="text-xs text-foreground/50">Puede tardar unos segundos</p>
        </div>
      )}

      {/* Superposiciones del escenario (chips de outfit, acciones…) */}
      {children}
    </div>
  );
}
