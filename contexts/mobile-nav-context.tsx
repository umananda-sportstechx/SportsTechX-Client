'use client';

import React, { createContext, useContext, useState } from 'react';

interface MobileNavContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileNavContext = createContext<MobileNavContextType | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen(v => !v),
    }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider');
  return ctx;
}
