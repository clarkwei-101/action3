//
// Application Routes
//
// noinspection Annotator

import Router, { useRouter } from 'next/router';

export const ROUTE_INDEX = '/';
export const ROUTE_APP_CHAT = '/';
export const ROUTE_APP_CALL = '/call';
export const ROUTE_APP_LINK_CHAT = '/link/chat/[chatLinkId]';
export const ROUTE_APP_NEWS = '/news';
export const ROUTE_APP_PERSONAS = '/personas';

export const getCallbackUrl = (source: 'openrouter') => {
  const callbackUrl = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost', 'http://localhost');
  callbackUrl.pathname = '/link/callback_openrouter';
  return callbackUrl.toString();
};

export const getChatLinkRelativePath = (chatLinkId: string) =>
  ROUTE_APP_LINK_CHAT.replace('[chatLinkId]', chatLinkId);

export function useRouterQuery<TQuery>(): TQuery {
  const { query } = useRouter();
  return (query || {}) as TQuery;
}

export function useRouterRoute(): string {
  const { route } = useRouter();
  return route;
}

export const navigateToIndex = () => Router.push(ROUTE_INDEX);
export const navigateToNews = () => Router.push(ROUTE_APP_NEWS);
export const navigateToPersonas = () => Router.push(ROUTE_APP_PERSONAS);
export const navigateBack = Router.back;
export const reloadPage = () => { if (typeof window !== 'undefined') window.location.reload(); };

function navigateFn(path: string) {
  return (replace?: boolean): Promise<boolean> => Router[replace ? 'replace' : 'push'](path);
}
