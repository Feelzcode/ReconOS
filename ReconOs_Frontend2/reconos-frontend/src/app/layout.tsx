// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import QueryProvider from '@/components/layout/QueryProvider';

export const metadata: Metadata = {
  title: 'ReconOs — Payment Operations OS',
  description: 'Monitor, reconcile, and recover customer payments in real time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'inherit',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
