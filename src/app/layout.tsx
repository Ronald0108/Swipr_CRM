import type { Metadata } from 'next';
import '@/styles/index.css';
import { ThemeProvider } from '@/app/components/ThemeProviderWrapper';

export const metadata: Metadata = {
  title: 'SwiprCRM — High-velocity lead sorting for your sales team',
  description:
    'A keyboard-centric interface for sorting your leads. Flow state prospecting that turns lead management into a high-velocity workflow.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ scrollBehavior: 'smooth' }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
