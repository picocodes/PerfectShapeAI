import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "PerfectShape AI",
  description: "Gamified AI weight loss coaching"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
