"use client";

import { clsx } from "@/lib/clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Logo de marca (lockup Glamour Studio). Pásale la altura con className (h-8, h-9…). */
export function Brand({
  className,
  back = false,
}: {
  className?: string;
  back?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {back && (
        <span className="text-2xl font-bold leading-none text-pink-dark/60" aria-hidden>
          ‹
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icono.png"
        alt="Glamour Studio"
        draggable={false}
        className={clsx("w-auto select-none", className)}
      />
    </span>
  );
}

/** Botón principal: pill, degradado de marca, sombra "chunky" con feedback táctil. */
export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-lg font-bold text-white",
        "bg-gradient-to-b from-[#ff6aa9] to-pink",
        "shadow-[0_6px_0_var(--pink-dark)] transition-[transform,box-shadow,filter]",
        "hover:brightness-[1.04] active:translate-y-1 active:shadow-[0_2px_0_var(--pink-dark)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_var(--pink-dark)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Botón secundario: pill, superficie clara con borde de marca. */
export function GhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full border-2 border-pink/30 bg-surface/80 px-5 py-2 font-semibold text-pink-dark backdrop-blur",
        "transition hover:border-pink hover:bg-surface active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-lg)] border border-white/80 bg-surface/85 p-5 shadow-[var(--shadow-card)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Chip / etiqueta pequeña. */
export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-white bg-surface/80 px-3 py-1 text-sm font-semibold text-pink-dark backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Medidor de estrellas (modo historia). */
export function StarMeter({
  value,
  total = 3,
  className,
}: {
  value: number;
  total?: number;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex gap-0.5", className)} aria-label={`${value} de ${total} estrellas`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={i < value ? "text-gold" : "text-pink-soft"}
          style={{ filter: i < value ? "drop-shadow(0 1px 1px rgba(216,39,111,.25))" : undefined }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
