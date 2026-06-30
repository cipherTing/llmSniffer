"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { createElement } from "react";
import type { ComponentType, ReactNode } from "react";

const NextThemes = NextThemesProvider as ComponentType<ThemeProviderProps & { children?: ReactNode }>;

export function ThemeProvider({ children }: { children: ReactNode }) {
  return createElement(
    NextThemes,
    {
      attribute: "class",
      defaultTheme: "system",
      disableTransitionOnChange: true,
      enableSystem: true,
    },
    children,
  );
}
