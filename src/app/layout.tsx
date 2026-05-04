import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Rufus AI Shopper - Amazon Shopping Assistant",
  description: "AI-powered shopping assistant that analyzes Amazon product reviews to give you personalized recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><rect width='24' height='24' rx='5' fill='%23febd69'/><path d='M8 8h8v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8z' fill='%23131921'/><path d='M9 6a3 3 0 0 1 6 0' stroke='%23131921' stroke-width='1.5'/></svg>" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
