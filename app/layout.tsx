import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QuickBooks Transaction Review',
  description: 'Review and edit existing transactions before syncing changes.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
