import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, display, body } from "./theme";

// ---------- Helpers ----------

const useRise = (delay = 0, distance = 36) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.7 },
  });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${(1 - s) * distance}px)`,
  } as const;
};

const usePop = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 160, mass: 0.8 },
  });
  return { opacity: Math.min(1, s * 1.4), transform: `scale(${s})` } as const;
};

const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 12, dur - 14, dur],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------- Fondo persistente ----------

const Blob: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
}> = ({ x, y, size, color, speed, phase }) => {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame / speed + phase) * 40;
  const dy = Math.cos(frame / (speed * 1.2) + phase) * 40;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(90px)",
        transform: `translate(${dx}px, ${dy}px)`,
        opacity: 0.55,
      }}
    />
  );
};

const Background: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
    <Blob x={-150} y={-150} size={620} color="#ffe1f0" speed={70} phase={0} />
    <Blob x={1380} y={-120} size={560} color="#efe2ff" speed={90} phase={2} />
    <Blob x={650} y={760} size={640} color="#ffeef6" speed={80} phase={4} />
  </AbsoluteFill>
);

const Sparkle: React.FC<{ x: number; y: number; delay: number; size: number }> =
  ({ x, y, delay, size }) => {
    const frame = useCurrentFrame();
    const f = frame + delay;
    const float = Math.sin(f / 24) * 10;
    const tw = 0.5 + 0.5 * Math.sin(f / 12);
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y + float,
          fontSize: size,
          opacity: tw,
        }}
      >
        ✨
      </div>
    );
  };

// ---------- UI ----------

const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const st = useRise(delay);
  return (
    <div
      style={{
        ...st,
        fontFamily: body,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: C.pink,
        fontSize: 28,
      }}
    >
      {children}
    </div>
  );
};

const Title: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
}> = ({ children, delay = 0, size = 96 }) => {
  const st = useRise(delay);
  return (
    <div
      style={{
        ...st,
        fontFamily: display,
        fontWeight: 800,
        color: C.pinkDark,
        fontSize: size,
        lineHeight: 1.05,
        textAlign: "center",
        textShadow: "0 4px 0 rgba(216,39,111,0.12)",
      }}
    >
      {children}
    </div>
  );
};

const StepCard: React.FC<{
  emoji: string;
  title: string;
  desc: string;
  delay: number;
  accent: string;
}> = ({ emoji, title, desc, delay, accent }) => {
  const st = usePop(delay);
  return (
    <div
      style={{
        ...st,
        width: 380,
        background: C.surface,
        border: "4px solid #ffffff",
        borderRadius: 36,
        padding: 44,
        boxShadow: "0 24px 60px -20px rgba(216,39,111,0.35)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 110,
          height: 110,
          margin: "0 auto",
          borderRadius: 28,
          background: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
          boxShadow: "0 8px 20px -6px rgba(216,39,111,0.4)",
        }}
      >
        {emoji}
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          color: C.pinkDark,
          fontSize: 38,
          marginTop: 22,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: body,
          fontWeight: 500,
          color: C.muted,
          fontSize: 27,
          marginTop: 10,
          lineHeight: 1.3,
        }}
      >
        {desc}
      </div>
    </div>
  );
};

const Chip: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const st = usePop(delay);
  return (
    <div
      style={{
        ...st,
        fontFamily: body,
        fontWeight: 700,
        fontSize: 30,
        color: C.pinkDark,
        background: C.white,
        border: `3px solid ${C.pinkSoft}`,
        borderRadius: 999,
        padding: "16px 30px",
        boxShadow: "0 10px 26px -14px rgba(216,39,111,0.4)",
      }}
    >
      {label}
    </div>
  );
};

const Stars: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[0, 1, 2].map((i) => {
        const on = frame > delay + i * 8;
        return (
          <span
            key={i}
            style={{
              fontSize: 44,
              color: on ? C.gold : C.pinkSoft,
              transform: `scale(${on ? 1 : 0.7})`,
              transition: "none",
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

const ModeCard: React.FC<{
  emoji: string;
  title: string;
  desc: string;
  delay: number;
  tone: "pink" | "grape";
  stars?: boolean;
}> = ({ emoji, title, desc, delay, tone, stars }) => {
  const st = usePop(delay);
  const grad =
    tone === "pink"
      ? "linear-gradient(180deg, #ffe6f1, #fffafd)"
      : "linear-gradient(180deg, #ece0ff, #fffafd)";
  return (
    <div
      style={{
        ...st,
        width: 460,
        height: 470,
        background: grad,
        border: "5px solid #ffffff",
        borderRadius: 44,
        padding: 48,
        boxShadow: "0 28px 70px -22px rgba(216,39,111,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 90 }}>{emoji}</div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          color: C.pinkDark,
          fontSize: 48,
          marginTop: 10,
        }}
      >
        {title}
      </div>
      {stars && (
        <div style={{ marginTop: 14 }}>
          <Stars delay={delay + 14} />
        </div>
      )}
      <div
        style={{
          fontFamily: body,
          fontWeight: 500,
          color: C.muted,
          fontSize: 30,
          marginTop: 18,
          lineHeight: 1.35,
        }}
      >
        {desc}
      </div>
    </div>
  );
};

// ---------- Escenas ----------

const SceneIntro: React.FC<{ dur: number }> = ({ dur }) => {
  const logo = usePop(6);
  const frame = useCurrentFrame();
  const dressFloat = Math.sin(frame / 18) * 14;
  return (
    <Scene dur={dur}>
      <div style={{ position: "absolute", top: 230, fontSize: 130, transform: `translateY(${dressFloat}px)` }}>
        👗
      </div>
      <div style={{ ...logo, marginTop: 120 }}>
        <Img src={staticFile("icono.png")} style={{ width: 760, height: "auto" }} />
      </div>
      <div style={{ marginTop: 24 }}>
        <Title delay={22} size={52}>Tu probador virtual con IA</Title>
      </div>
    </Scene>
  );
};

const SceneConcept: React.FC<{ dur: number }> = ({ dur }) => (
  <Scene dur={dur}>
    <Eyebrow delay={2}>La idea</Eyebrow>
    <div style={{ marginTop: 18 }}>
      <Title delay={8} size={84}>
        Tu ropa real,
        <br />
        puesta por IA
      </Title>
    </div>
    <div
      style={{
        display: "flex",
        gap: 28,
        marginTop: 56,
        alignItems: "center",
      }}
    >
      <Chip label="📸 Tu foto" delay={26} />
      <span style={{ fontFamily: display, fontSize: 56, color: C.pink }}>+</span>
      <Chip label="🧥 Tu ropa" delay={34} />
      <span style={{ fontFamily: display, fontSize: 56, color: C.pink }}>=</span>
      <Chip label="✨ Tu look" delay={42} />
    </div>
  </Scene>
);

const SceneSteps: React.FC<{ dur: number }> = ({ dur }) => (
  <Scene dur={dur}>
    <Eyebrow delay={2}>Cómo funciona</Eyebrow>
    <div style={{ marginTop: 14 }}>
      <Title delay={8} size={72}>Tres pasos y listo</Title>
    </div>
    <div style={{ display: "flex", gap: 40, marginTop: 64 }}>
      <StepCard
        delay={24}
        emoji="📸"
        title="1. Tu foto"
        desc="Sube una foto de cuerpo completo"
        accent={C.pinkSoft}
      />
      <StepCard
        delay={36}
        emoji="🧥"
        title="2. Tu ropa"
        desc="Sube tus prendas reales"
        accent="#ece0ff"
      />
      <StepCard
        delay={48}
        emoji="🪄"
        title="3. ¡Vístete!"
        desc="Toca y la IA genera tu look"
        accent="#fff0c9"
      />
    </div>
  </Scene>
);

const SceneModes: React.FC<{ dur: number }> = ({ dur }) => (
  <Scene dur={dur}>
    <Eyebrow delay={2}>Dos formas de jugar</Eyebrow>
    <div style={{ marginTop: 14 }}>
      <Title delay={8} size={72}>Modo Libre y Modo Historia</Title>
    </div>
    <div style={{ display: "flex", gap: 56, marginTop: 56 }}>
      <ModeCard
        delay={26}
        tone="pink"
        emoji="🎨"
        title="Modo Libre"
        desc="Crea sin límites y guarda tus looks"
      />
      <ModeCard
        delay={40}
        tone="grape"
        emoji="🗺️"
        title="Modo Historia"
        desc="Supera niveles y gana 3 estrellas"
        stars
      />
    </div>
  </Scene>
);

const SceneTech: React.FC<{ dur: number }> = ({ dur }) => (
  <Scene dur={dur}>
    <Eyebrow delay={2}>Bajo el capó</Eyebrow>
    <div style={{ marginTop: 14 }}>
      <Title delay={8} size={72}>Ingeniería de verdad</Title>
    </div>
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        justifyContent: "center",
        maxWidth: 1300,
        marginTop: 60,
      }}
    >
      <Chip label="Next.js 16 + React 19" delay={24} />
      <Chip label="Supabase · Auth + RLS" delay={30} />
      <Chip label="Gemini 3 Pro Image" delay={36} />
      <Chip label="Quitar fondo · WebGPU" delay={42} />
      <Chip label="Realtime sync" delay={48} />
      <Chip label="Extensión de navegador" delay={54} />
      <Chip label="Vercel AI Gateway" delay={60} />
      <Chip label="Tests + CI" delay={66} />
    </div>
  </Scene>
);

const SceneOutro: React.FC<{ dur: number }> = ({ dur }) => {
  const logo = usePop(6);
  const frame = useCurrentFrame();
  const heart = 1 + Math.sin(frame / 10) * 0.06;
  return (
    <Scene dur={dur}>
      <div style={logo}>
        <Img src={staticFile("icono.png")} style={{ width: 620, height: "auto" }} />
      </div>
      <div style={{ marginTop: 30 }}>
        <Title delay={18} size={56}>
          Vístete con IA <span style={{ display: "inline-block", transform: `scale(${heart})` }}>💖</span>
        </Title>
      </div>
      <div
        style={{
          ...useRise(30),
          marginTop: 28,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 36,
          color: C.white,
          background: `linear-gradient(180deg, #ff6aa9, ${C.pink})`,
          borderRadius: 999,
          padding: "20px 44px",
          boxShadow: `0 8px 0 ${C.pinkDark}`,
        }}
      >
        glamour-studio-omega.vercel.app
      </div>
    </Scene>
  );
};

// ---------- Composición principal ----------

export const Presentation: React.FC = () => {
  const intro = 120;
  const concept = 150;
  const steps = 180;
  const modes = 180;
  const tech = 180;
  const outro = 150;
  let t = 0;
  const at = (d: number) => {
    const from = t;
    t += d;
    return from;
  };

  return (
    <AbsoluteFill style={{ fontFamily: body }}>
      <Background />
      <Sparkle x={250} y={200} delay={0} size={48} />
      <Sparkle x={1600} y={300} delay={20} size={40} />
      <Sparkle x={1500} y={820} delay={40} size={52} />
      <Sparkle x={180} y={780} delay={60} size={36} />

      <Sequence durationInFrames={intro}>
        <SceneIntro dur={intro} />
      </Sequence>
      <Sequence from={at(intro)} durationInFrames={concept}>
        <SceneConcept dur={concept} />
      </Sequence>
      <Sequence from={at(concept)} durationInFrames={steps}>
        <SceneSteps dur={steps} />
      </Sequence>
      <Sequence from={at(steps)} durationInFrames={modes}>
        <SceneModes dur={modes} />
      </Sequence>
      <Sequence from={at(modes)} durationInFrames={tech}>
        <SceneTech dur={tech} />
      </Sequence>
      <Sequence from={at(tech)} durationInFrames={outro}>
        <SceneOutro dur={outro} />
      </Sequence>
    </AbsoluteFill>
  );
};
