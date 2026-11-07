"use client";

import React, { useState } from "react";
// @ts-ignore
import * as HeroUI from "@heroui/react-original";

// Re-export all original HeroUI v3 components directly
export * from "@heroui/react-original";

// ─── CardBody ────────────────────────────────────────────────────────────────
// HeroUI v3 renamed CardBody → CardContent
export const CardBody = HeroUI.CardContent;

// ─── Radio ───────────────────────────────────────────────────────────────────
// Official HeroUI v3 compound Radio composition
export const Radio = ({ children, value, description, className, ...props }: any) => {
  return (
    <HeroUI.Radio value={value} className={className} {...props}>
      <HeroUI.Radio.Content>
        <HeroUI.Radio.Control>
          <HeroUI.Radio.Indicator />
        </HeroUI.Radio.Control>
        {children}
      </HeroUI.Radio.Content>
      {description && <HeroUI.Description>{description}</HeroUI.Description>}
    </HeroUI.Radio>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────
export const Divider = HeroUI.Separator;

// ─── Progress ────────────────────────────────────────────────────────────────
// Official HeroUI v3 ProgressBar composition
export const Progress = ({ value = 0, label, className = "", ...props }: any) => {
  return (
    <HeroUI.ProgressBar value={value} className={`w-full ${className}`} {...props}>
      {label && <HeroUI.ProgressBar.Output>{label}</HeroUI.ProgressBar.Output>}
      <HeroUI.ProgressBar.Track>
        <HeroUI.ProgressBar.Fill />
      </HeroUI.ProgressBar.Track>
    </HeroUI.ProgressBar>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────
// Context to pass isOpen/onOpenChange down to ModalContent
const ModalControlledContext = React.createContext<{
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}>({});

export const Modal = ({ isOpen, onOpenChange, children, ...props }: any) => {
  return (
    <ModalControlledContext.Provider value={{ isOpen, onOpenChange }}>
      <HeroUI.Modal isOpen={isOpen} onOpenChange={onOpenChange} {...props}>
        {children}
      </HeroUI.Modal>
    </ModalControlledContext.Provider>
  );
};

// ModalContent: supports both render-prop pattern {(onClose) => (...)} and direct children
export const ModalContent = ({ children, ...props }: any) => {
  const { isOpen, onOpenChange } = React.useContext(ModalControlledContext);
  const onClose = () => onOpenChange?.(false);

  // Support render-prop pattern used throughout the codebase
  const content = typeof children === "function" ? children(onClose) : children;

  return (
    <HeroUI.Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUI.Modal.Container>
        <HeroUI.Modal.Dialog {...props}>
          {content}
        </HeroUI.Modal.Dialog>
      </HeroUI.Modal.Container>
    </HeroUI.Modal.Backdrop>
  );
};

// ─── Table ───────────────────────────────────────────────────────────────────
// Wraps in the React Aria collection context required by HeroUI v3

export const Table = ({ children, className, ...props }: any) => {
  return (
    <HeroUI.Table className={className}>
      <HeroUI.Table.ScrollContainer>
        <HeroUI.Table.Content {...props}>
          {children}
        </HeroUI.Table.Content>
      </HeroUI.Table.ScrollContainer>
    </HeroUI.Table>
  );
};

// TableHeader: auto-injects isRowHeader on the FIRST TableColumn child
// This satisfies React Aria's requirement without touching every page file
export const TableHeader = ({ children, ...props }: any) => {
  const childArray = React.Children.toArray(children);
  const patchedChildren = childArray.map((child, index) => {
    if (index === 0 && React.isValidElement(child)) {
      // Inject isRowHeader on the first column if not already set
      const existing = (child.props as any).isRowHeader;
      if (!existing) {
        return React.cloneElement(child as React.ReactElement<any>, { isRowHeader: true });
      }
    }
    return child;
  });
  return <HeroUI.TableHeader {...props}>{patchedChildren}</HeroUI.TableHeader>;
};

// Re-export table sub-components for convenience
export const TableColumn = HeroUI.TableColumn;
export const TableBody = HeroUI.TableBody;
export const TableRow = HeroUI.TableRow;
export const TableCell = HeroUI.TableCell;

// ─── Tabs ────────────────────────────────────────────────────────────────────
// Tabs.List provides the React Aria collection context for Tab items
export const Tabs = ({ children, className, ...props }: any) => {
  return (
    <HeroUI.Tabs className={className} {...props}>
      <HeroUI.Tabs.List>
        {children}
      </HeroUI.Tabs.List>
    </HeroUI.Tabs>
  );
};

// ─── Minimal Navbar layout ───────────────────────────────────────────────────
export const Navbar = ({ children, className = "", ...props }: any) => (
  <header
    className={`w-full border-b border-separator bg-surface/95 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between ${className}`}
    {...props}
  >
    {children}
  </header>
);

export const NavbarBrand = ({ children, className = "", ...props }: any) => (
  <div className={`flex items-center gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export const NavbarContent = ({
  children,
  className = "",
  justify = "start",
  ...props
}: any) => (
  <div
    className={`flex items-center gap-4 ${
      justify === "center"
        ? "justify-center"
        : justify === "end"
        ? "justify-end ml-auto"
        : "justify-start"
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const NavbarItem = ({
  children,
  className = "",
  isActive,
  ...props
}: any) => (
  <div
    className={`flex items-center ${isActive ? "font-semibold text-accent" : ""} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const HeroUIProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

// ─── useDisclosure ────────────────────────────────────────────────────────────
export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (val: boolean) => setIsOpen(val),
  };
}
