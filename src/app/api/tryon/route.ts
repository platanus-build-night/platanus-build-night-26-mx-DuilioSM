import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTryonPrompt } from "@/lib/tryon-prompt";

// Generar imágenes puede tardar; ampliamos el tiempo máximo de la función.
export const maxDuration = 120;

// gemini-3-pro-image preserva mucho mejor el rostro/identidad en try-on
// multi-imagen (clave cuando las prendas vienen en modelos). Configurable por env.
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "google/gemini-3-pro-image";

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

  const prompt = buildTryonPrompt(garments);

  try {
    const result = await generateText({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            // El avatar va PRIMERO (referencia de identidad). El modelo pro ya
            // conserva el rostro; no lo duplicamos para evitar collages.
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
