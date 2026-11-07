import React, { useState } from "react";
// @ts-ignore
import * as OriginalHeroUI from "../../web/node_modules/@heroui/react/dist/index.js";

export * from "../../web/node_modules/@heroui/react/dist/index.js";

export const CardBody = OriginalHeroUI.CardContent || (({ children, className = "", ...props }: any) => (
  <div className={`p-4 ${className}`} {...props}>{children}</div>
));

export const ModalContent = OriginalHeroUI.ModalDialog || (({ children, className = "", ...props }: any) => (
  <div className={`relative bg-white rounded-xl shadow-xl overflow-hidden p-6 ${className}`} {...props}>{children}</div>
));

export const Divider = OriginalHeroUI.Separator || (({ className = "", ...props }: any) => (
  <hr className={`border-neutral-200 my-4 ${className}`} {...props} />
));

export const Progress = (({ value = 0, color = "primary", className = "", ...props }: any) => {
  return (
    <div className={`w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden ${className}`} {...props}>
      <div
        className="bg-primary h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
});

export const SelectItem = (({ children, key, value, ...props }: any) => (
  <option value={value || key} {...props}>{children}</option>
));

export const HeroUIProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (val: boolean) => setIsOpen(val),
  };
}

