import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Libre_Baskerville,
  Newsreader,
  Nunito,
  Outfit,
  Source_Sans_3,
  Syne,
} from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-libre",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const pageFontVariables = [
  newsreader.variable,
  fraunces.variable,
  nunito.variable,
  cormorant.variable,
  outfit.variable,
  syne.variable,
  dmSans.variable,
  libre.variable,
  sourceSans.variable,
].join(" ");
