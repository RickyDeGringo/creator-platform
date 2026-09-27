import { pageFontVariables } from "@/lib/page-fonts";
import { themeStyle, type PageFont, type PagePalette } from "@/lib/page-theme";
import { cn } from "@/lib/utils";

export function PageTheme({
  palette,
  font,
  preview = false,
  className,
  children,
}: {
  palette: PagePalette;
  font: PageFont;
  preview?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "page-theme",
        preview ? undefined : "flex flex-1 flex-col",
        pageFontVariables,
        className,
      )}
      style={themeStyle(palette, font)}
      data-font={font}
      data-palette={palette}
    >
      {children}
    </div>
  );
}
