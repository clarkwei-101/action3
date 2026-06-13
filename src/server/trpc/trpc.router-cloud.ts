import { createTRPCRouter } from './trpc.server';

import { browseRouter } from '~/modules/browse/browse.router';
import { tradeRouter } from '~/modules/trade/server/trade.router';

// Action3 custom routers (requires Node.js runtime for Prisma + SQLite)
import { action3Router } from '~/server/trpc/routers/action3';

/**
 * Cloud rooter, which is geolocated in 1 location and separate from the other routers.
 * NOTE: at the time of writing, the location is aws|us-east-1
 */
export const appRouterCloud = createTRPCRouter({
  browse: browseRouter,
  trade: tradeRouter,
  // Action3: prompt templates, browser config/session, AGI tasks, custom pages
  action3: action3Router,
});

// export type definition of API
export type AppRouterCloud = typeof appRouterCloud;