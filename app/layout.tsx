import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CustomerLayoutShell } from '@/components/customer/CustomerLayoutShell';

export const metadata: Metadata = {
  title: 'Aurelia Cathērine | Digital Services & Products Marketplace',
  description: 'Premium digital marketplace and automated services portal with manual QRIS deposit verification, instant balance transactions, and dedicated administrator control center.',
  openGraph: {
    title: 'Aurelia Cathērine',
    description: 'Premium digital marketplace and automated services portal with manual QRIS deposit verification, instant balance transactions, and dedicated administrator control center.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurelia Cathērine',
    description: 'Premium digital marketplace and automated services portal with manual QRIS deposit verification, instant balance transactions, and dedicated administrator control center.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0284c7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-900" suppressHydrationWarning>
        <CustomerLayoutShell>{children}</CustomerLayoutShell>
      </body>
    </html>
  );
}


