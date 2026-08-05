"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Define our own props interface since next-themes 15.0+ might export it differently, 
// or we can just use React.ComponentProps.
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
