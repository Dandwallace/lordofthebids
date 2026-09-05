import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lord of the Bids',
  description: 'Private eBay UK arbitrage scanner.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
