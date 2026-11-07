import React, { useState } from "react";

export function HeroUIProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (val: boolean) => setIsOpen(val),
  };
}

export function Button({
  children,
  className = "",
  color = "default",
  variant = "solid",
  size = "md",
  onPress,
  onClick,
  isLoading,
  disabled,
  startContent,
  endContent,
  ...props
}: any) {
  const handleClick = (e: any) => {
    if (disabled || isLoading) return;
    if (onPress) onPress(e);
    if (onClick) onClick(e);
  };

  // Base sizing
  let sizeClass = "px-4 py-2.5 text-sm rounded-xl";
  if (size === "sm") sizeClass = "px-3 py-1.5 text-xs rounded-lg";
  if (size === "lg") sizeClass = "px-6 py-3.5 text-base rounded-2xl";

  // Variant & Color
  let styleClass = "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-[0.98]";
  if (color === "primary") {
    if (variant === "flat") {
      styleClass = "bg-emerald-50 text-[#0c831f] hover:bg-emerald-100 active:scale-[0.98]";
    } else {
      styleClass = "bg-[#0c831f] text-white hover:bg-[#0a6c1a] shadow-sm active:scale-[0.98]";
    }
  } else if (color === "danger") {
    if (variant === "flat") {
      styleClass = "bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.98]";
    } else {
      styleClass = "bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98]";
    }
  } else if (color === "success") {
    styleClass = "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[0.98]";
  } else if (variant === "light") {
    styleClass = "bg-transparent text-neutral-600 hover:bg-neutral-100 active:scale-[0.98]";
  } else if (variant === "flat") {
    styleClass = "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-[0.98]";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${styleClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        startContent
      )}
      {children}
      {endContent}
    </button>
  );
}

export function Card({ children, className = "", ...props }: any) {
  return (
    <div
      className={`bg-white rounded-2xl border border-neutral-200/90 shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: any) {
  return (
    <div className={`p-5 pb-3 border-b border-neutral-100 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }: any) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }: any) {
  return (
    <div className={`p-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Chip({
  children,
  className = "",
  color = "default",
  variant = "flat",
  size = "md",
  startContent,
  ...props
}: any) {
  let sizeClass = "px-2.5 py-1 text-xs";
  if (size === "sm") sizeClass = "px-2 py-0.5 text-[11px]";
  if (size === "lg") sizeClass = "px-3.5 py-1.5 text-sm";

  let colorClass = "bg-neutral-100 text-neutral-700";
  if (color === "success") {
    colorClass = "bg-emerald-50 text-[#0c831f] border border-emerald-200/60 font-semibold";
  } else if (color === "warning") {
    colorClass = "bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold";
  } else if (color === "danger") {
    colorClass = "bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${colorClass} ${className}`}
      {...props}
    >
      {startContent}
      {children}
    </span>
  );
}

export function Alert({ children, color = "default", className = "", ...props }: any) {
  let colorClass = "bg-neutral-100 border-neutral-200 text-neutral-800";
  if (color === "danger") {
    colorClass = "bg-rose-50 border-rose-200 text-rose-700";
  } else if (color === "success") {
    colorClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
  }

  return (
    <div className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${colorClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Progress({ value = 0, className = "", color = "primary", ...props }: any) {
  const safeVal = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full bg-neutral-200 rounded-full h-3 overflow-hidden ${className}`} {...props}>
      <div
        className="bg-[#0c831f] h-full rounded-full transition-all duration-300"
        style={{ width: `${safeVal}%` }}
      />
    </div>
  );
}

export function Divider({ className = "", ...props }: any) {
  return <hr className={`border-neutral-200 my-4 ${className}`} {...props} />;
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  ...props
}: any) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-semibold text-neutral-600">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0c831f] ${className}`}
        {...props}
      />
    </div>
  );
}

export function Tabs({ children, selectedKey, onSelectionChange, className = "" }: any) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function Tab({ title, children, key }: any) {
  return (
    <div data-tab={key}>
      {children}
    </div>
  );
}

export function Modal({ isOpen, children, onClose }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        {children}
      </div>
    </div>
  );
}

export function ModalContent({ children }: any) {
  return <>{children}</>;
}

export function ModalHeader({ children }: any) {
  return <div className="font-bold text-lg pb-3 border-b border-neutral-100">{children}</div>;
}

export function ModalBody({ children }: any) {
  return <div className="py-4">{children}</div>;
}

export function ModalFooter({ children }: any) {
  return <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">{children}</div>;
}
