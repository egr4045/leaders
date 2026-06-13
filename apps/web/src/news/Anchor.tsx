import { useEffect, useRef, useState } from 'react';

function MouthShape({ state }: { state: number }) {
  if (state === 0)
    return (
      <path
        d="M207 128 Q220 133 233 128"
        stroke="#7c2d12"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    );
  if (state === 1) return <ellipse cx="220" cy="130" rx="11" ry="5" fill="#5c1a1a" />;
  if (state === 2)
    return (
      <>
        <ellipse cx="220" cy="132" rx="14" ry="9" fill="#5c1a1a" />
        <ellipse cx="220" cy="128" rx="12" ry="4" fill="white" opacity="0.85" />
      </>
    );
  return (
    <>
      <ellipse cx="220" cy="134" rx="16" ry="12" fill="#5c1a1a" />
      <ellipse cx="220" cy="128" rx="14" ry="5" fill="white" opacity="0.85" />
      <ellipse cx="220" cy="141" rx="8" ry="3" fill="#cc4444" opacity="0.55" />
    </>
  );
}

export function Anchor({
  audioEl,
  currentLine,
}: {
  audioEl: HTMLAudioElement | null;
  currentLine?: string;
}) {
  const [mouth, setMouth] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioEl) {
      setMouth(0);
      return;
    }
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audioEl);
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    sourceRef.current.connect(analyser);
    analyser.connect(ctx.destination);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    const loop = () => {
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i]!;
      const vol = sum / buf.length / 255;
      setMouth(vol < 0.03 ? 0 : vol < 0.1 ? 1 : vol < 0.2 ? 2 : 3);
      raf = requestAnimationFrame(loop);
    };
    void ctx.resume();
    loop();
    return () => {
      cancelAnimationFrame(raf);
      analyser.disconnect();
      sourceRef.current?.disconnect();
    };
  }, [audioEl]);

  const ticker = currentLine ?? 'ПРЯМОЙ ЭФИР • МИРОВЫЕ НОВОСТИ • ЛИДЕРЫ';

  return (
    <svg viewBox="0 0 400 260" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="studioBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#091628" />
          <stop offset="100%" stopColor="#0c2244" />
        </linearGradient>
        <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0a1e3a" />
        </linearGradient>
        <clipPath id="tickerClip">
          <rect x="92" y="224" width="268" height="35" />
        </clipPath>
      </defs>

      {/* Studio background */}
      <rect width="400" height="260" fill="url(#studioBg)" />

      {/* Subtle TV scan lines */}
      {Array.from({ length: 13 }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1={i * 20}
          x2="400"
          y2={i * 20}
          stroke="white"
          strokeWidth="0.5"
          opacity="0.025"
        />
      ))}

      {/* Globe wireframe backdrop */}
      <circle cx="200" cy="100" r="145" fill="none" stroke="#1e4b7a" strokeWidth="1" opacity="0.35" />
      <circle cx="200" cy="100" r="98" fill="none" stroke="#1e4b7a" strokeWidth="0.6" opacity="0.2" />
      <ellipse cx="200" cy="100" rx="145" ry="56" fill="none" stroke="#1e4b7a" strokeWidth="0.6" opacity="0.2" />
      <ellipse cx="200" cy="100" rx="145" ry="100" fill="none" stroke="#1e4b7a" strokeWidth="0.6" opacity="0.15" />
      <line x1="200" y1="-45" x2="200" y2="225" stroke="#1e4b7a" strokeWidth="0.6" opacity="0.2" />

      {/* Channel logo — top right */}
      <circle cx="373" cy="22" r="18" fill="#cc0000" />
      <text x="373" y="29" textAnchor="middle" fill="white" fontSize="19" fontWeight="bold" fontFamily="serif">
        ①
      </text>

      {/* LIVE indicator — top left */}
      <circle cx="18" cy="15" r="5" fill="#cc0000">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <text x="28" y="19" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="600">
        ПРЯМОЙ ЭФИР
      </text>

      {/* Suit / body */}
      <path d="M155 235 L170 152 Q200 139 220 137 Q240 139 270 152 L285 235 Z" fill="#0d1e3d" />
      {/* Shirt collar whites */}
      <path d="M207 153 L220 139 L233 153 L220 166 Z" fill="white" opacity="0.88" />
      {/* Tie */}
      <path d="M217 165 L223 165 L225 202 L220 207 L215 202 Z" fill="#cc0000" />

      {/* Neck */}
      <rect x="212" y="148" width="16" height="26" rx="4" fill="#f0b090" />

      {/* Head */}
      <ellipse cx="220" cy="100" rx="43" ry="48" fill="#f5c3a0" />

      {/* Ears */}
      <ellipse cx="177" cy="105" rx="6" ry="10" fill="#eeac88" />
      <ellipse cx="263" cy="105" rx="6" ry="10" fill="#eeac88" />

      {/* Hair */}
      <ellipse cx="220" cy="59" rx="43" ry="22" fill="#3d2314" />
      <ellipse cx="184" cy="72" rx="17" ry="23" fill="#3d2314" />
      <ellipse cx="256" cy="72" rx="17" ry="23" fill="#3d2314" />

      {/* Eyebrows */}
      <path d="M199 88 Q209 83 218 88" stroke="#3d2314" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M222 88 Q231 83 241 88" stroke="#3d2314" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Left eye */}
      <ellipse cx="208" cy="98" rx="9" ry="7" fill="white" />
      <ellipse cx="208" cy="98" rx="5.5" ry="5.5" fill="#3d2314" />
      <circle cx="208" cy="98" r="2.5" fill="#111" />
      <circle cx="210" cy="96" r="1.5" fill="white" opacity="0.7" />

      {/* Right eye */}
      <ellipse cx="232" cy="98" rx="9" ry="7" fill="white" />
      <ellipse cx="232" cy="98" rx="5.5" ry="5.5" fill="#3d2314" />
      <circle cx="232" cy="98" r="2.5" fill="#111" />
      <circle cx="234" cy="96" r="1.5" fill="white" opacity="0.7" />

      {/* Nose */}
      <path
        d="M218 109 Q215 117 213 120 Q220 123 227 120 Q225 117 222 109"
        fill="#e8a87c"
        opacity="0.5"
      />

      {/* Mouth — 4 lipsync states */}
      <MouthShape state={mouth} />

      {/* Cheek blush */}
      <ellipse cx="191" cy="112" rx="13" ry="8" fill="#ff9070" opacity="0.11" />
      <ellipse cx="249" cy="112" rx="13" ry="8" fill="#ff9070" opacity="0.11" />

      {/* Desk surface */}
      <ellipse cx="220" cy="234" rx="130" ry="18" fill="url(#deskGrad)" />
      <rect x="90" y="226" width="260" height="7" rx="2" fill="#122b4f" />

      {/* Microphone */}
      <rect x="177" y="208" width="5" height="20" rx="2.5" fill="#475569" />
      <ellipse cx="179.5" cy="208" rx="8" ry="6" fill="#64748b" />
      <ellipse cx="179.5" cy="226" rx="10" ry="4" fill="#334155" />

      {/* Red bottom banner */}
      <rect x="0" y="226" width="400" height="34" fill="#cc0000" />

      {/* ВЕСТИ label */}
      <text x="10" y="249" fill="white" fontSize="19" fontWeight="bold" fontFamily="sans-serif" letterSpacing="2">
        ВЕСТИ
      </text>

      {/* Divider */}
      <line x1="86" y1="229" x2="86" y2="258" stroke="white" strokeWidth="1" opacity="0.45" />

      {/* Scrolling ticker */}
      <g clipPath="url(#tickerClip)">
        <text y="249" fill="white" fontSize="13" fontFamily="sans-serif">
          <animate attributeName="x" from="370" to="-700" dur="16s" repeatCount="indefinite" />
          {ticker}
        </text>
      </g>

      {/* Bottom-right label */}
      <text x="390" y="249" fill="white" fontSize="10" fontFamily="sans-serif" textAnchor="end" opacity="0.55">
        ЛИДЕРЫ
      </text>
    </svg>
  );
}
