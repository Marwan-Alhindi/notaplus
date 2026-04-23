"use client"
import '@/styles/global.css'; // Import global styles
import { UserProvider } from '@/UserContext';
import type { AppProps } from 'next/app'; // Import AppProps from next/app

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}

export default MyApp;