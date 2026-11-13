import { Geist_Mono, Inter } from "next/font/google";

/**
 * Typography is a deliberate brand decision (matches the MaintainX-inspired palette):
 * Inter for interface text, Geist Mono for reference codes and hashes.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const fontRegistry = {
  inter: { label: "Inter", font: inter },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontVars = [inter.variable, geistMono.variable].join(" ");
