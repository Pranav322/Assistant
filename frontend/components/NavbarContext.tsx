"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type NavbarContextType = {
  title: string;
  setTitle: (title: string) => void;
  backHref: string | null;
  setBackHref: (href: string | null) => void;
  projectName: string | null;
  setProjectName: (name: string | null) => void;
};

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  const [backHref, setBackHref] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  return (
    <NavbarContext.Provider
      value={{ title, setTitle, backHref, setBackHref, projectName, setProjectName }}
    >
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
}
