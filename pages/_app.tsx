import * as React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { MyAppProps } from 'next/app';
import { Brand } from '~/common/app.config';
import { apiQuery } from '~/common/util/trpc.client';

const VercelAnalytics = dynamic(() => import('@vercel/analytics/next').then(mod => mod.Analytics), { ssr: false });
const VercelSpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights), { ssr: false });

import '~/common/styles/app.styles.css';

import { ErrorBoundary } from '~/common/components/ErrorBoundary';
import { SnackbarInsert } from '~/common/components/snackbar/SnackbarInsert';
import { Is } from '~/common/util/pwaUtils';


const ActionProApp = ({ Component, emotionCache, pageProps }: MyAppProps) => {
  const getLayout = Component.getLayout ?? ((page: any) => page);

  return <>
    <Head>
      <title>{Brand.Title.Common}</title>
      <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no' />
    </Head>
    <ErrorBoundary outer>
      <SnackbarInsert />
      {getLayout(<Component {...pageProps} />)}
    </ErrorBoundary>
    {Is.Deployment.VercelFromFrontend && <VercelAnalytics debug={false} />}
    {Is.Deployment.VercelFromFrontend && <VercelSpeedInsights debug={false} sampleRate={1 / 2} />}
  </>;
};

export default apiQuery.withTRPC(ActionProApp);
