"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useCloset } from "@/lib/store";
import { GhostButton } from "@/components/ui";

export function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();
  const reset = useCloset((s) => s.reset);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        onClick={logout}
        aria-label="Salir"
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-pink/20 bg-white/80 text-pink-dark shadow-sm transition active:scale-90"
      >
        <SignOut weight="bold" />
      </button>
    );
  }

  return <GhostButton onClick={logout}>Salir</GhostButton>;
}
