import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "SAMolar", description: "Segment anything. Mostly molars." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
