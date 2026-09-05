import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lord of the Bids',
  description: 'Find items to buy and resell on eBay UK, with the numbers worked out honestly.',
  icons: {
    icon: [
      {
        url:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
              '<path d="M6.6 12.2 5.1 6.4a.55.55 0 0 1 .85-.58l3.4 2.5 2.6-4.2a.55.55 0 0 1 .95 0l2.6 4.2 3.4-2.5a.55.55 0 0 1 .85.58l-1.5 5.8z" fill="#059669"/>' +
              '<rect x="6.2" y="12.1" width="13.4" height="1.7" rx="0.5" fill="#c8a046"/>' +
              '<path d="M14.8 14.6h9.9a3 3 0 0 1 3 3v9.9a3 3 0 0 1-3 3h-9.9a3 3 0 0 1-3-3v-9.9a3 3 0 0 1 3-3z" transform="rotate(-38 19.75 22.55)" fill="#0f1e3d"/>' +
              '<circle cx="23.1" cy="16.9" r="1.7" fill="#fff"/>' +
              '</svg>',
          ),
        type: 'image/svg+xml',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f7fa',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
