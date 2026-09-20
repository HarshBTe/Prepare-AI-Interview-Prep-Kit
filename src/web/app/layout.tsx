import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../context/AuthContext";

export const metadata: Metadata = {
  title: "AI Interview Prep Kit",
  description:
    "Personalized AI-powered interview preparation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}