import React from "react";

export default function UserLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-150">
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Outer buffer ripple ring */}
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/25 animate-ping opacity-75" />
        
        {/* Circular buffer spinning track */}
        <div className="w-10 h-10 rounded-full border-[2.5px] border-emerald-100/90 border-t-[#0c831f] border-r-[#0c831f] animate-spin" />
        
        {/* Center dot */}
        <div className="w-2 h-2 rounded-full bg-[#0c831f]" />
      </div>
      <span className="text-xs font-semibold text-neutral-500 mt-3.5 tracking-wide">
        Loading...
      </span>
    </div>
  );
}
