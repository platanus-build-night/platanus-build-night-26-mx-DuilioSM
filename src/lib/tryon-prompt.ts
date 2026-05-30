// Construcción del prompt de try-on. Lógica PURA (sin red, sin DOM) para que
// sea fácilmente testeable y mantenga el comportamiento determinista por
// categoría (regla del vestido, identidad, cuerpo completo, fondo).

export interface PromptGarment {
  category?: string;
  name?: string;
}

const DRESS_RE = /vestido|dress|gown|jumpsuit|romper|enteriz|overall/i;

/** ¿Hay un vestido / pieza entera entre las prendas? (por categoría o nombre) */
export function hasDressGarment(garments: PromptGarment[]): boolean {
  return garments.some(
    (g) => g.category === "dress" || DRESS_RE.test(g.name ?? ""),
  );
}

/** ¿Hay una prenda inferior (pantalón/falda) seleccionada? */
export function hasBottomGarment(garments: PromptGarment[]): boolean {
  return garments.some((g) => g.category === "bottom");
}

/** Regla determinista del vestido según lo seleccionado. */
export function dressRuleFor(garments: PromptGarment[]): string {
  const dress = hasDressGarment(garments);
  const bottom = hasBottomGarment(garments);
  if (dress && !bottom) {
    return "2. CRITICAL — a DRESS / one-piece is selected and NO separate bottom was chosen: the person wears ONLY the dress. You MUST completely REMOVE the original jeans, pants, leggings or skirt. Below the dress hem show the person's BARE LEGS (skin). There must be ZERO trousers, jeans, denim or leggings visible anywhere in the image.";
  }
  if (dress && bottom) {
    return "2. A dress AND a separate bottom were both selected on purpose: layer the dress OVER the provided bottom (e.g. the dress over leggings/jeans), keeping both visible.";
  }
  return "2. If any provided garment is a dress, gown, jumpsuit or one-piece, it covers BOTH torso and legs: there must be NO pants, jeans, leggings, shorts or skirt under or below it (show bare legs below the hem).";
}

/** Lista numerada de prendas para el prompt. */
export function garmentList(garments: PromptGarment[]): string {
  return garments
    .map(
      (g, i) =>
        `  ${i + 1}. ${g.name || "prenda"}${g.category ? ` (${g.category})` : ""}`,
    )
    .join("\n");
}

/** Construye el prompt completo de try-on para las prendas seleccionadas. */
export function buildTryonPrompt(garments: PromptGarment[]): string {
  return [
    "You are a virtual try-on image generator.",
    "",
    "The FIRST image is the person (the user) wearing an ORIGINAL outfit. It is your identity reference.",
    "OUTPUT EXACTLY ONE PERSON: the result must contain a SINGLE full-body figure of that same person, shown ONCE. Do NOT create a grid, collage, contact sheet, film strip, multiple poses, side-by-side variations, duplicates or several copies of the person. One person, one figure, centered.",
    "Treat this as a precise EDIT of the first photo, NOT a new image: every pixel that is not a garment being replaced must stay IDENTICAL to the first photo.",
    "KEEP THIS EXACT PERSON: their FACE, facial features, hairstyle, hair color, skin tone, body shape, height and pose must stay 100% identical and recognizable — it must unmistakably be the SAME individual shown in the first image.",
    "IDENTITY LOCK (highest priority): the person in the first image is the ONLY human you may keep. The other images are CLOTHING references that often show OTHER people (models) wearing the clothes — you MUST completely IGNORE those models: do NOT copy or blend their face, hair, hair color, skin tone or body. NEVER replace the person with a model from a garment photo. If in doubt, copy the face and body from the first image exactly.",
    "PRESERVE THE COMPOSITION EXACTLY: same camera framing, same zoom/scale, same crop, and the person in the SAME position within the frame as the first photo. Do NOT recenter, resize, zoom, shift or re-crop the person. The output must have the SAME aspect ratio as the first image.",
    "ALWAYS SHOW THE FULL BODY: the entire person must be visible from the top of the head down to the feet/shoes, completely inside the frame, with empty margin above the head and below the feet (exactly like the first image). NEVER crop, cut off or zoom into the head, torso, legs or feet. The feet must always be visible.",
    "",
    "The other images (after the first) are CLOTHING REFERENCES. From EACH one take ONLY the garment fabric, shape, color and pattern —",
    "completely IGNORE the person/model wearing it, plus any mannequin, hanger, background or other clothing in that photo.",
    "Garments to apply:",
    garmentList(garments),
    "",
    "HOW TO COMBINE (very important):",
    "1. Replace ONLY the body areas covered by the provided garments. Every OTHER part of the original outfit MUST stay EXACTLY as in the first photo — same garment, same color, same style. Do not restyle or recolor what you are not replacing.",
    "   • If only a bottom (pants/jeans/skirt/shorts) is provided → keep the person's ORIGINAL top unchanged.",
    "   • If only a top is provided → keep the person's ORIGINAL bottom unchanged.",
    "   • If only shoes are provided → change only the footwear.",
    "1b. When a TOP is provided, FULLY REMOVE the person's original upper-body garment, including any tank top, t-shirt or undershirt. The new top must REPLACE it, never be layered ON TOP of it. NONE of the original top may remain visible — not at the neckline, sleeves, sides or hem.",
    "    • Let the new top fall naturally to the waistband so it covers wherever the original top used to be. Only if it is genuinely a cropped style, leave a small natural amount of bare skin below its hem — but NEVER fill that area with the original top or any invented undershirt.",
    dressRuleFor(garments),
    "3. Do NOT add any garment or accessory that was neither provided nor already worn in the original photo.",
    "4. Fit each new garment realistically: correct drape, folds, layering, and shadows/lighting consistent with the body and pose. Keep the same framing as the first photo.",
    "5. BACKGROUND: keep the background PIXEL-IDENTICAL to the first photo — same exact color and brightness. Do NOT relight, recolor, brighten, darken or tint it, and NEVER let the garment colors influence it. For example, a green top must NOT make the background greenish, and a dark garment must NOT darken the backdrop. No colored backdrops, gradients, scenery or props.",
    "",
    "Output: ONE single full-body image of the SAME person from the first image (same face and identity), wearing the new garments, centered on a clean, neutral, uncolored light background. Exactly one person, shown once. No grid, no collage, no duplicates, no text, watermarks, logos or extra people. Return only the final image.",
  ].join("\n");
}
