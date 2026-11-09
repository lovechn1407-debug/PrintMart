import React from "react";

export function GuillocheAura() {
  return (
    <div className="absolute top-0 inset-x-0 h-96 pointer-events-none select-none overflow-hidden z-0">
      {/* Soft Golden Radial Glow */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#fde047]/40 via-[#fef08a]/15 to-transparent" />

      {/* Left Delicate Contour Guilloché Waves */}
      <svg
        className="absolute -top-6 -left-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <path
            key={`left-arc-${i}`}
            d={`M -20 ${20 + i * 16} C 120 ${10 + i * 16}, 210 ${90 + i * 16}, 260 ${240 + i * 16}`}
            stroke="currentColor"
            strokeWidth="0.85"
            strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
          />
        ))}
      </svg>

      {/* Right Delicate Contour Guilloché Waves */}
      <svg
        className="absolute -top-6 -right-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <path
            key={`right-arc-${i}`}
            d={`M 340 ${20 + i * 16} C 200 ${10 + i * 16}, 110 ${90 + i * 16}, 60 ${240 + i * 16}`}
            stroke="currentColor"
            strokeWidth="0.85"
            strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
          />
        ))}
      </svg>

      {/* Center Golden Halo */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-44 bg-radial from-[#fde68a]/30 via-transparent to-transparent blur-xl" />
    </div>
  );
}

