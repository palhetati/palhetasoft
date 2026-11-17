import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/tokens.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Palheta Soft | Gestão de Estabelecimentos',
  description: 'Sistema ERP responsivo para gestão operacional, financeira e contábil.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-canvas-soft text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
