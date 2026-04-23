import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";

export const metadata: Metadata = {
  title: "ConstruBot",
  description: "WhatsApp-like messaging application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="pt-BR" data-theme="mydark">
      <body className="h-screen overflow-hidden bg-base-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
