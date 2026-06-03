import '../../node_modules/tw-animate-css/dist/tw-animate.css';
import '../../node_modules/shadcn/dist/tailwind.css';
import '../../node_modules/@fontsource-variable/geist/index.css';
import '../index.css';
import { Providers } from '../components/providers';

export const metadata = {
  title: 'Hunchmate — Accelerate Innovation From Vision to Value',
  description: 'Hunchmate — Accelerate Innovation From Vision to Value. A global platform for enterprise hackathons, hiring challenges, and innovation programs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Plus Jakarta Sans Font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&display=swap" rel="stylesheet" />

        {/* Material Symbols */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />

        {/* Switzer Font */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=switzer@500&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
