import { useEffect, useRef, useState } from 'react';

/**
 * «Говорящая голова» диктора (раздел 10): статичная голова + 4 спрайта рта.
 * Липсинк В БРАУЗЕРЕ: AnalyserNode меряет громкость и переключает рот.
 * Никакой генерации видео.
 */
const MOUTHS = [
  // закрыт
  <path key="0" d="M35 72 Q50 74 65 72" stroke="#7c2d12" strokeWidth="3" fill="none" />,
  // полуоткрыт
  <ellipse key="1" cx="50" cy="73" rx="9" ry="4" fill="#7c2d12" />,
  // открыт
  <ellipse key="2" cx="50" cy="74" rx="11" ry="8" fill="#7c2d12" />,
  // широко
  <ellipse key="3" cx="50" cy="75" rx="13" ry="11" fill="#7c2d12" />,
];

export function Anchor({ audioEl }: { audioEl: HTMLAudioElement | null }) {
  const [mouth, setMouth] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioEl) return;
    // AudioContext и source создаются один раз на элемент
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
      const vol = sum / buf.length / 255; // 0..1
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

  return (
    <svg viewBox="0 0 100 100" className="h-40 w-40">
      {/* студийный фон */}
      <rect width="100" height="100" rx="12" fill="#0f172a" />
      <circle cx="50" cy="30" r="4" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* голова робота-ведущего */}
      <rect x="25" y="38" width="50" height="46" rx="10" fill="#cbd5e1" />
      <rect x="20" y="52" width="6" height="14" rx="3" fill="#94a3b8" />
      <rect x="74" y="52" width="6" height="14" rx="3" fill="#94a3b8" />
      {/* глаза */}
      <circle cx="38" cy="56" r="5" fill="#0ea5e9" />
      <circle cx="62" cy="56" r="5" fill="#0ea5e9" />
      {/* рот — спрайт по громкости */}
      {MOUTHS[mouth]}
      {/* галстук */}
      <polygon points="50,84 45,92 50,100 55,92" fill="#b91c1c" />
    </svg>
  );
}
