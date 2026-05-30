import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generar imágenes puede tardar; ampliamos el tiempo máximo de la función.
export const maxDuration = 120;

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "google/gemini-2.5-flash-image";

interface GarmentInput {
  src: string; // data URL
  category?: string;
  name?: string;
}

interface Body {
  avatar: string; // data URL
  garments: GarmentInput[];
}

export async function POST(req: Request) {
  // Solo usuarios autenticados pueden generar.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { avatar, garments } = body;
  if (!avatar) {
    return NextResponse.json(
      { error: "Falta la foto del avatar." },
      { status: 400 },
    );
  }
  if (!garments?.length) {
    return NextResponse.json(
      { error: "Selecciona al menos una prenda." },
      { status: 400 },
    );
  }

  const garmentList = garments
    .map(
      (g, i) =>
        `  ${i + 1}. ${g.name || "prenda"}${g.category ? ` (${g.category})` : ""}`,
    )
    .join("\n");

  // Regla del vestido según la selección (determinista, por categoría):
  //  - vestido SIN pantalón seleccionado -> SOLO el vestido, piernas desnudas.
  //  - vestido CON pantalón seleccionado -> permitido en capas (vestido sobre pantalón).
  const hasDress = garments.some(
    (g) =>
      g.category === "dress" ||
      /vestido|dress|gown|jumpsuit|romper|enteriz|overall/i.test(g.name ?? ""),
  );
  const hasBottom = garments.some((g) => g.category === "bottom");

  const dressRule =
    hasDress && !hasBottom
      ? "2. CRITICAL — a DRESS / one-piece is selected and NO separate bottom was chosen: the person wears ONLY the dress. You MUST completely REMOVE the original jeans, pants, leggings or skirt. Below the dress hem show the person's BARE LEGS (skin). There must be ZERO trousers, jeans, denim or leggings visible anywhere in the image."
      : hasDress && hasBottom
        ? "2. A dress AND a separate bottom were both selected on purpose: layer the dress OVER the provided bottom (e.g. the dress over leggings/jeans), keeping both visible."
        : "2. If any provided garment is a dress, gown, jumpsuit or one-piece, it covers BOTH torso and legs: there must be NO pants, jeans, leggings, shorts or skirt under or below it (show bare legs below the hem).";

  const prompt = [
    "You are a virtual try-on image generator.",
    "",
    "The FIRST image is a full-body photo of a person wearing an ORIGINAL outfit.",
    "Treat this as a precise EDIT of that first image, NOT a new image: every pixel that is not a garment being replaced must stay IDENTICAL to the first photo.",
    "KEEP THIS EXACT PERSON: their FACE, facial features, hairstyle, hair color, skin tone, body shape, height and pose must stay 100% identical and recognizable — it must unmistakably be the SAME individual as in the first image.",
    "IDENTITY LOCK (highest priority): the person in the first image is the ONLY human you may keep. The garment reference images often show OTHER people (models) wearing the clothes — you MUST completely IGNORE those models: do NOT copy or blend their face, hair, hair color, skin tone or body. NEVER replace the person with a model from a garment photo. If in doubt, keep the first image's person exactly.",
    "PRESERVE THE COMPOSITION EXACTLY: same camera framing, same zoom/scale, same crop, and the person in the SAME position within the frame as the first photo. Do NOT recenter, resize, zoom, shift or re-crop the person. The output must have the SAME aspect ratio as the first image.",
    "ALWAYS SHOW THE FULL BODY: the entire person must be visible from the top of the head down to the feet/shoes, completely inside the frame, with empty margin above the head and below the feet (exactly like the first image). NEVER crop, cut off or zoom into the head, torso, legs or feet. The feet must always be visible.",
    "",
    "The remaining images are CLOTHING REFERENCES. From EACH one take ONLY the garment fabric, shape, color and pattern —",
    "completely IGNORE the person/model wearing it, plus any mannequin, hanger, background or other clothing in that photo.",
    "Garments to apply:",
    garmentList,
    "",
    "HOW TO COMBINE (very important):",
    "1. Replace ONLY the body areas covered by the provided garments. Every OTHER part of the original outfit MUST stay EXACTLY as in the first photo — same garment, same color, same style. Do not restyle or recolor what you are not replacing.",
    "   • If only a bottom (pants/jeans/skirt/shorts) is provided → keep the person's ORIGINAL top unchanged.",
    "   • If only a top is provided → keep the person's ORIGINAL bottom unchanged.",
    "   • If only shoes are provided → change only the footwear.",
    "1b. When a TOP is provided, FULLY REMOVE the person's original upper-body garment, including any tank top, t-shirt or undershirt. The new top must REPLACE it, never be layered ON TOP of it. NONE of the original top may remain visible — not at the neckline, sleeves, sides or hem.",
    "    • Let the new top fall naturally to the waistband so it covers wherever the original top used to be. Only if it is genuinely a cropped style, leave a small natural amount of bare skin below its hem — but NEVER fill that area with the original top or any invented undershirt.",
    dressRule,
    "3. Do NOT add any garment or accessory that was neither provided nor already worn in the original photo.",
    "4. Fit each new garment realistically: correct drape, folds, layering, and shadows/lighting consistent with the body and pose. Keep the same framing as the first photo.",
    "5. BACKGROUND: keep the background PIXEL-IDENTICAL to the first photo — same exact color and brightness. Do NOT relight, recolor, brighten, darken or tint it, and NEVER let the garment colors influence it. For example, a green top must NOT make the background greenish, and a dark garment must NOT darken the backdrop. No colored backdrops, gradients, scenery or props.",
    "",
    "Output: the full-body result showing the SAME person from the first image (same face and identity), wearing the new garments, on that same clean, neutral, uncolored light background. No text, watermarks, logos, collage or extra people. Return only the final image.",
  ].join("\n");

  try {
    const result = await generateText({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: avatar },
            ...garments.map((g) => ({ type: "image" as const, image: g.src })),
          ],
        },
      ],
    });

    const imageFile = result.files.find((f) =>
      f.mediaType?.startsWith("image/"),
    );

    if (!imageFile) {
      // Diagnóstico: por qué no vino imagen (moderación, refusal, etc.)
      const diag = {
        finishReason: result.finishReason,
        text: result.text?.slice(0, 300),
        warnings: result.warnings,
        files: result.files.map((f) => f.mediaType),
      };
      console.error("[tryon] sin imagen:", JSON.stringify(diag));
      const reason =
        result.text?.slice(0, 160) ||
        `finishReason=${result.finishReason}`;
      return NextResponse.json(
        {
          error: `El modelo no devolvió una imagen (${reason}). Intenta de nuevo.`,
          diag,
        },
        { status: 502 },
      );
    }

    // file.base64 NO incluye el prefijo data:, lo añadimos nosotros.
    const dataUrl = `data:${imageFile.mediaType};base64,${imageFile.base64}`;
    return NextResponse.json({ image: dataUrl });
  } catch (err) {
    console.error("[tryon] error:", err);
    const message =
      err instanceof Error ? err.message : "Error generando la imagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
