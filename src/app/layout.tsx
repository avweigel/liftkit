import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "@/styles/globals.css";
import { Nav } from "@/components/nav";
import { MeasurementProvider } from "@/components/measurement-provider";
import { getUnitPrefs } from "@/lib/measurement";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "LiftKit",
  description: "Plan, log and progress your training.",
  appleWebApp: { capable: true, title: "LiftKit", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1520" },
  ],
};

// runs before paint so a saved theme never flashes. accents from the old
// palette list (amber, rainbow, ...) fall back to the default, dawn.
const INIT_THEME = `(function(){try{var t=localStorage.getItem('liftkit:theme');var a=localStorage.getItem('liftkit:accent');if(t&&t!=='system')document.documentElement.dataset.theme=t;if(a==='fjord'||a==='lingon')document.documentElement.dataset.accent=a;}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { measurement } = await getUnitPrefs();
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_THEME }} />
      </head>
      <body className="flex min-h-full flex-col bg-(--background) text-(--foreground)">
        <MeasurementProvider value={measurement}>
          <div className="flex flex-1 flex-col">{children}</div>
          <Nav />
        </MeasurementProvider>
      </body>
    </html>
  );
}
