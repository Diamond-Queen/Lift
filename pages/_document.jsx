import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Google Fonts: Inter, Playfair Display, Great Vibes */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Great+Vibes&display=swap" rel="stylesheet" />
        {/* Bootstrap CSS (CDN) */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-+qdLa9u5m3e5F2b4b7x1Y6dZr3z2b6K9mZQ5c5V1r9Yl5S1H6x8g8z9Qv1K5oQeK" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
