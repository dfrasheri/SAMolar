import "./globals.css";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export const metadata = { title: "SAMolar", description: "Segment anything. Mostly molars." };

export default function RootLayout({ children }: { children: ReactNode }) {
  const user = getSessionUser();
  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar userName={user.name} />
            <main className="flex-1 p-6">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
