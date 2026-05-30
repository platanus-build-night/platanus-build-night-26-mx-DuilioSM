# Duilio Sotelo — Platanus Build Night — Ciudad de México Project

**Current project logo:** src/app/icon.png

<img src="./project-logo.png" alt="Glamour Studio" width="200" />

Hacker:

- Duilio Sotelo ([@DuilioSM](https://github.com/DuilioSM))

Before submitting:

- ✅ Set a project name, oneliner and description in build-night-project.json
- ✅ Provide a 1000x1000 png project logo, max 500kb (project-logo.png)
- ✅ Provide a concise and to the point readme

## ⚠️ Deploying (Vercel, Render, etc.)

Deploy platforms like **Vercel**, **Render** or **Netlify** can only connect to
repositories **you own** — they can't be granted access to this organization repo.
To deploy while keeping your commits here, mirror your code to a personal repo:

1. Create a **personal** repository on your own GitHub account.
2. Point your local `origin` at **both** repos, so a single `git push` updates each one:

   ```bash
   # this org repo (keep it as a push target)...
   git remote set-url --add --push origin https://github.com/platanus-build-night/platanus-build-night-26-mx-DuilioSM.git
   # ...and your personal repo
   git remote set-url --add --push origin https://github.com/<your-user>/<your-repo>.git
   ```

   From now on `git push` sends every commit to **both** repositories.
3. Connect your deploy service (Vercel, Render, …) to your **personal** repo and deploy from there.

Your commits stay mirrored here for judging, while the deploy runs from the repo you control.

Have fun! 🚀

---

# 👗 Glamour Studio

Probador virtual con IA, **mobile-first**. Subes una foto de cuerpo completo + tus
prendas reales, **tocas la ropa para vestirte** y la IA (Google **Gemini 2.5 Flash
Image** vía **Vercel AI Gateway**) genera al instante cómo se te ve el outfit puesto.

> 📐 **Arquitectura técnica y diagramas:** ver [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> — pipeline de imagen (WebGPU + Web Worker), RLS por usuario, Realtime,
> extensión de navegador (MV3) y el flujo de IA.

## Cómo funciona

1. **Cuenta** (`/login`)
   - Inicias sesión con Supabase. Tu avatar, prendas y looks quedan ligados a tu
     cuenta y sincronizados entre dispositivos.
2. **Onboarding** (`/onboarding`)
   - Subes 1 foto de cuerpo completo (tu avatar).
   - Subes tus prendas y les asignas categoría (blusa, pantalón, vestido, zapatos…).
   - **Quita el fondo automáticamente** (en el navegador, sin API): deja solo a la
     persona o la prenda como PNG transparente. Se puede desactivar con un toggle.
3. **El Probador** (`/play`)
   - Pantalla **mobile-first**: el espejo (tu look) fijo arriba y un **riel de
     perchas** deslizable abajo, con pestañas por categoría.
   - **Tocas una prenda y te la pones** (en escritorio también puedes arrastrarla
     al avatar). El look se **autogenera** al cambiar el outfit — sin botón manual.
   - Descargas o guardas tus looks; quedan en una galería (hoja **💖 Tus looks**).
4. **Modo Historia** (`/challenges`)
   - Niveles de outfit que se superan ganando hasta **3 estrellas** cada uno. Las
     metas se evalúan localmente (sin coste de IA) en tiempo real.
5. **Extensión de navegador** (`/extension`)
   - Importa prendas desde tiendas (Amazon, Zara, Bershka…) con un clic. Llegan a
     tu guardarropa como "pendientes" y la app les quita el fondo y las clasifica.
     Ver [`extension/README.md`](./extension/README.md).

Las imágenes se procesan/redimensionan en el navegador y se guardan en **Supabase
Storage** (URLs firmadas); los metadatos en Postgres, con actualización en vivo
(Realtime) cuando la extensión añade prendas. La llamada a la IA ocurre en el
servidor (`/api/tryon`).

## Configuración

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un `.env.local` con tus credenciales:
   ```bash
   # Vercel AI Gateway (Dashboard → AI Gateway → API Keys)
   AI_GATEWAY_API_KEY=tu_key_aqui
   # opcional, para más calidad:
   # GEMINI_IMAGE_MODEL=google/gemini-3-pro-image

   # Supabase (Project Settings → API)
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
   ```
   > En producción dentro de Vercel no necesitas `AI_GATEWAY_API_KEY`: se usa OIDC
   > automáticamente.
   >
   > En Supabase crea un bucket `wardrobe` y las tablas de prendas/looks con RLS por
   > usuario (las keys públicas no dan acceso a nada sin sesión).
3. Arranca en desarrollo:
   ```bash
   npm run dev
   ```

## Deploy en Vercel

```bash
vercel
```

Añade `AI_GATEWAY_API_KEY` (o conecta el AI Gateway desde el dashboard) y las
variables `NEXT_PUBLIC_SUPABASE_*` en el proyecto.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 — sistema de diseño "boutique de caramelo" (Baloo 2 + Quicksand)
- **Supabase** (`@supabase/ssr`): auth, Storage y Postgres + Realtime
- Zustand para el estado global del guardarropa
- Vercel AI SDK (`ai`) + AI Gateway → `google/gemini-2.5-flash-image`
- `@imgly/background-removal` para quitar el fondo en el navegador (sin servidor)
- `motion` (animaciones) y `@phosphor-icons/react` (iconografía)

## Estructura

```
src/
  app/
    page.tsx              # landing / menú de modos
    login/page.tsx        # auth con Supabase
    onboarding/page.tsx   # subir foto + prendas
    play/page.tsx         # El Probador (mobile + escritorio)
    challenges/page.tsx   # Modo Historia (niveles con estrellas)
    extension/connect/    # entrega el token a la extensión
    api/tryon/route.ts    # genera el look con la IA
    api/import/route.ts   # recibe prendas de la extensión
    api/classify/route.ts # clasifica prendas importadas
  components/
    AvatarStage.tsx       # el espejo (con drop zone en escritorio)
    HangerRail.tsx        # riel de perchas (mobile) — tocar para vestir
    LooksSheet.tsx        # hoja inferior con la galería de looks (mobile)
    Wardrobe.tsx          # guardarropa por categorías (escritorio)
    ui.tsx                # botones / cards / chips / medidor de estrellas
  lib/
    store.ts              # estado global (Zustand)
    data.ts               # acceso a Supabase (Storage + Postgres)
    challenges.ts         # niveles y reglas del Modo Historia
    image.ts              # quitar fondo / redimensionar / encuadrar
    supabase/             # clientes de Supabase (browser/server/middleware)
    types.ts              # tipos y categorías
extension/                # extensión Chrome/Edge para importar prendas
```

## Notas / próximos pasos

- **Costo**: cada generación de look = 1 imagen de Gemini. Considera límites por
  usuario.
- **Calidad**: prueba `google/gemini-3-pro-image` para resultados más realistas.
- **Modo Historia**: las metas se evalúan con reglas locales (`lib/challenges.ts`);
  fácil de ampliar con más niveles.
