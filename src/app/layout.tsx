import "./globals.css";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";

export const metadata = { title: "SAMolar", description: "Segment anything. Mostly molars." };

export default function RootLayout({ children }: { children: ReactNode }) {
  const user = getSessionUser();
  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar userName={user.name} />
            <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
            <CommandPalette />
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
