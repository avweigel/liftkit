import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "liftkit",
  description: "a personal workout tracker",
};

const INIT_THEME = `(function(){try{var t=localStorage.getItem('liftkit:theme');var a=localStorage.getItem('liftkit:accent');if(t&&t!=='system')document.documentElement.dataset.theme=t;if(a&&a!=='amber')document.documentElement.dataset.accent=a;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_THEME }} />
      </head>
      <body className="flex min-h-full flex-col bg-(--background) text-(--foreground)">
        <Nav />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
