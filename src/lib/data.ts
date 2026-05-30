"use client";

import { createClient } from "@/lib/supabase/client";
import { blobToDataURL } from "@/lib/image";
import type { Category } from "@/lib/types";

const BUCKET = "wardrobe";
const SIGN_TTL = 60 * 60; // 1h

export interface GarmentItem {
  id: string;
  src: string; // URL firmada para mostrar
  storage_path: string;
  category: Category;
  name: string;
}

export interface LookItem {
  id: string;
  src: string;
  storage_path: string;
  garmentIds: string[];
  createdAt: number;
}

async function uid(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

async function signed(path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL);
  if (error || !data) throw error ?? new Error("No se pudo firmar la URL");
  return data.signedUrl;
}

/** Convierte una URL (firmada) a data URL para enviarla a la IA. */
export async function urlToDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Clasifica una prenda (Blob) usando el endpoint de visión. */
export async function classifyGarment(blob: Blob): Promise<Category> {
  try {
    const dataUrl = await blobToDataURL(blob);
    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!res.ok) return "other";
    const data = (await res.json()) as { category?: Category };
    return data.category ?? "other";
  } catch {
    return "other";
  }
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------- Avatar ----------
export async function getAvatar(): Promise<{ path: string; src: string } | null> {
  const supabase = createClient();
  const id = await uid();
  const { data } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", id)
    .maybeSingle();
  if (!data?.avatar_path) return null;
  return { path: data.avatar_path, src: await signed(data.avatar_path) };
}

export async function setAvatar(
  blob: Blob,
): Promise<{ path: string; src: string }> {
  const supabase = createClient();
  const id = await uid();
  const path = `${id}/avatar.png`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type || "image/webp" });
  if (upErr) throw upErr;
  const { error: dbErr } = await supabase
    .from("profiles")
    .upsert({ id, avatar_path: path, updated_at: new Date().toISOString() });
  if (dbErr) throw dbErr;
  return { path, src: await signed(path) };
}

// ---------- Garments ----------
export async function listGarments(): Promise<GarmentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (r) => ({
      id: r.id as string,
      storage_path: r.storage_path as string,
      category: r.category as Category,
      name: r.name as string,
      src: await signed(r.storage_path as string),
    })),
  );
}

export async function addGarment(
  blob: Blob,
  category: Category,
  name: string,
): Promise<GarmentItem> {
  const supabase = createClient();
  const id = await uid();
  const path = `${id}/garments/${crypto.randomUUID()}.png`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/webp" });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("garments")
    .insert({ user_id: id, storage_path: path, category, name })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    storage_path: data.storage_path,
    category: data.category,
    name: data.name,
    src: await signed(data.storage_path),
  };
}

export async function updateGarmentCategory(
  garmentId: string,
  category: Category,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("garments")
    .update({ category })
    .eq("id", garmentId);
  if (error) throw error;
}

export async function removeGarment(item: {
  id: string;
  storage_path: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([item.storage_path]);
  const { error } = await supabase.from("garments").delete().eq("id", item.id);
  if (error) throw error;
}

// ---------- Looks ----------
export async function listLooks(): Promise<LookItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("looks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (r) => ({
      id: r.id as string,
      storage_path: r.storage_path as string,
      garmentIds: (r.garment_ids as string[]) ?? [],
      createdAt: new Date(r.created_at as string).getTime(),
      src: await signed(r.storage_path as string),
    })),
  );
}

export async function addLook(
  imageDataUrl: string,
  garmentIds: string[],
): Promise<LookItem> {
  const supabase = createClient();
  const id = await uid();
  const path = `${id}/looks/${crypto.randomUUID()}.png`;
  const blob = dataURLtoBlob(imageDataUrl);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/webp" });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("looks")
    .insert({ user_id: id, storage_path: path, garment_ids: garmentIds })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    storage_path: data.storage_path,
    garmentIds: (data.garment_ids as string[]) ?? [],
    createdAt: new Date(data.created_at as string).getTime(),
    src: await signed(data.storage_path),
  };
}

export async function removeLook(item: {
  id: string;
  storage_path: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([item.storage_path]);
  const { error } = await supabase.from("looks").delete().eq("id", item.id);
  if (error) throw error;
}
