"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton, Card, Brand } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/play";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
              next,
            )}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Confirmación de email desactivada -> ya hay sesión
          router.push(next);
          router.refresh();
        } else {
          setInfo(
            "¡Cuenta creada! Revisa tu correo para confirmar y luego inicia sesión. 💌",
          );
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <div className="mb-5 flex rounded-full bg-pink-soft/50 p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
              mode === m ? "bg-pink text-white shadow" : "text-pink-dark"
            }`}
          >
            {m === "signin" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-pink-dark">
          Correo
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-pink/30 bg-white px-3 py-2 text-foreground outline-none focus:border-pink"
            placeholder="tu@correo.com"
          />
        </label>
        <label className="text-sm font-semibold text-pink-dark">
          Contraseña
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-pink/30 bg-white px-3 py-2 text-foreground outline-none focus:border-pink"
            placeholder="mínimo 6 caracteres"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
            {info}
          </p>
        )}

        <PrimaryButton type="submit" disabled={busy} className="mt-1 w-full">
          {busy
            ? "Un momento…"
            : mode === "signin"
              ? "Entrar 💕"
              : "Crear cuenta ✨"}
        </PrimaryButton>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <Link href="/" aria-label="Inicio" className="mb-6">
        <Brand className="h-20 sm:h-24" />
      </Link>
      <Suspense fallback={<div className="text-pink-dark">Cargando…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
