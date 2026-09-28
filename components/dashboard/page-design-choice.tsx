"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { pageFont, pagePalette, type PageFont, type PagePalette } from "@/lib/page-theme";

type Choice = {
  palette: PagePalette;
  font: PageFont;
  setPalette: (palette: PagePalette) => void;
  setFont: (font: PageFont) => void;
};

const PageDesignChoiceContext = createContext<Choice | null>(null);

export function PageDesignChoice({
  palette,
  font,
  children,
}: {
  palette: string;
  font: string;
  children: ReactNode;
}) {
  const [paletteId, setPalette] = useState<PagePalette>(pagePalette(palette));
  const [fontId, setFont] = useState<PageFont>(pageFont(font));
  const saved = `${palette}:${font}`;
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    setSeen(saved);
    setPalette(pagePalette(palette));
    setFont(pageFont(font));
  }

  return (
    <PageDesignChoiceContext.Provider value={{ palette: paletteId, font: fontId, setPalette, setFont }}>
      {children}
    </PageDesignChoiceContext.Provider>
  );
}

export function usePageDesignChoice() {
  return useContext(PageDesignChoiceContext);
}
