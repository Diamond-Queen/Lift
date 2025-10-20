import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect for Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* FIX: Consolidated all required fonts (Inter, Poppins, Great Vibes) into a single efficient link.
          The old Bootstrap CSS link has been REMOVED as all components now use custom/Tailwind classes.
        */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700&display=swap" 
          rel="stylesheet" 
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
