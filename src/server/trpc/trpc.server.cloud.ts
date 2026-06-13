import { initTRPC } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import * as z from 'zod/v4';
import { prismaDb } from '../prisma/prismaDb';

/**
 * Identity transformer (no-op) for tRPC Cloud API.
 * Data passes through unchanged on both serialization and deserialization.
 */
const identityTransformer = {
  serialize: (object: unknown) => object,
  deserialize: (object: unknown) => object,
} as const;

/**
 * Context type for cloud procedures
 */
export type CloudContext = Awaited<ReturnType<typeof createCloudContext>>;

/**
 * Context factory for cloud routers
 */
const createCloudContext = async ({ req }: FetchCreateContextFnOptions) => {
  return {
    hostName: req.headers?.get('host') ?? 'localhost',
    reqSignal: req.signal,
    db: prismaDb,
  };
};

/**
 * Cloud tRPC initialization
 */
const tCloud = initTRPC.context<CloudContext>().create({
  transformer: identityTransformer,
  errorFormatter({ shape, error }) {
    const { stack, ...nonStackData } = shape.data;
    return {
      ...shape,
      data: {
        ...nonStackData,
        zodError:
          error.cause instanceof z.ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
});

export const createCloudRouter = tCloud.router;
export const publicCloudProcedure = tCloud.procedure;
