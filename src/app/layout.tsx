import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "R&D Command Center",
  description: "Capture ideas, run projects, manage the whole R&D pipeline.",
};

// Runs before paint so there's never a flash of the wrong theme. Reads a
// stored preference; falls back to the OS setting on first visit.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("rdcc-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
