import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import Script from 'next/script';
import { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'EqualPay',
  description: 'Split bills and travel smarter with EqualPay'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="strip-bis-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var clean = function () {
                  var nodes = document.querySelectorAll('[bis_skin_checked]');
                  for (var i = 0; i < nodes.length; i++) {
                    nodes[i].removeAttribute('bis_skin_checked');
                  }
                };
                clean();
                var observer = new MutationObserver(function () {
                  clean();
                });
                observer.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });
              })();
            `
          }}
        />
      </head>
      <body className={poppins.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
