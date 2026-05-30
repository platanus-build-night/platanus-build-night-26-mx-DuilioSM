"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import type { LookResult } from "@/lib/types";

/**
 * Hoja inferior (mobile) con la galería de looks generados. Mantener los looks
 * fuera del probador evita que empujen el espejo y el riel.
 */
export function LooksSheet({
  open,
  looks,
  deletingId,
  onClose,
  onSelect,
  onRemove,
}: {
  open: boolean;
  looks: LookResult[];
  deletingId: string | null;
  onClose: () => void;
  onSelect: (src: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Telón */}
          <button
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute inset-0 bg-pink-dark/35 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="relative max-h-[78dvh] rounded-t-[2rem] border-t-2 border-white bg-surface px-4 pt-3 shadow-2xl pb-safe"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-pink-soft" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold text-pink-dark">
                💖 Tus looks
                <span className="ml-1.5 text-sm font-bold text-pink-dark/40">
                  {looks.length}
                </span>
              </h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-pink/20 bg-white text-pink-dark transition active:scale-90"
              >
                <X weight="bold" />
              </button>
            </div>

            <div className="fancy-scroll grid max-h-[62dvh] grid-cols-3 gap-2.5 overflow-y-auto pb-2">
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
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white bg-white shadow"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={l.src}
                        alt="Look"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onClick={() => {
                          if (isDeleting) return;
                          onSelect(l.src);
                          onClose();
                        }}
                      />
                      <button
                        onClick={() => onRemove(l.id)}
                        disabled={isDeleting}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-pink-dark shadow transition active:scale-90 disabled:opacity-0"
                        aria-label="Eliminar look"
                      >
                        <X weight="bold" className="h-3.5 w-3.5" />
                      </button>
                      <AnimatePresence>
                        {isDeleting && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-pink-dark/35 backdrop-blur-[2px]"
                          >
                            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
