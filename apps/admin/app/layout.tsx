import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthGate } from '@/AuthGate';
import './globals.css';

export const metadata: Metadata = { title: 'IELTS PATH · Admin' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
