import '../styles/global.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { GameStateProvider } from '../context/GameStateProvider';

const PAGE_TITLE = 'Alignment Agency | AI Investigation Game';
const PAGE_DESCRIPTION =
  'Engage in a thrilling AI investigation game set in 2037. Play as John Voigt, an AI investigator from the US Alignment Agency, and uncover misaligned AIs.';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <GameStateProvider>
        <Head>
          <title>{PAGE_TITLE}</title>
          <meta name="description" content={PAGE_DESCRIPTION} />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          />
          <meta property="og:title" content={PAGE_TITLE} />
          <meta property="og:description" content={PAGE_DESCRIPTION} />
          <meta property="og:url" content="https://www.alignment-agency.ai" />
          <meta property="og:site_name" content="Alignment Agency" />
          <meta
            property="og:image"
            content="https://www.alignment-agency.ai/banner.png"
          />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={PAGE_TITLE} />
          <meta name="twitter:description" content={PAGE_DESCRIPTION} />
          <meta
            name="twitter:image"
            content="https://www.alignment-agency.ai/banner.png"
          />
          <link rel="icon" href="/favicon.ico" />
          <link rel="canonical" href="https://www.alignment-agency.ai" />
        </Head>
        <Component {...pageProps} />
      </GameStateProvider>
    </SessionProvider>
  );
}
