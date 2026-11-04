import type { ReactNode } from 'react';
import './globals.scss';

export const metadata = {
  title: 'Carbon next: React + Next.js',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
