import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Metadata } from "next";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { UploadProgress } from "@/components/upload/upload-progress";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insight Buddy - AI-Powered Meeting Intelligence",
  description: "Transform your meetings into actionable insights",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
          <Toaster />
          <UploadProgress />
        </ErrorBoundary>
      </body>
    </html>
  );
}
