import type { Metadata } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';

const title = 'Cinemoriq — AI Creative Operating System';
const description =
  'Cinemoriq unifies cinematic AI production, campaign orchestration, approvals, and performance workflows in one premium creative operating system.';

export function generateMetadata(): Metadata {
  const configuredOrigin = process.env.SITE_ORIGIN?.replace(/\/$/, '');
  const previewImage = configuredOrigin ? `${configuredOrigin}/og.png` : undefined;

  return {
    title,
    description,
    metadataBase: configuredOrigin ? new URL(configuredOrigin) : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Cinemoriq',
      images: previewImage
        ? [{ url: previewImage, width: 1200, height: 630, alt: title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: previewImage ? [previewImage] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
