/**
 * No-op transformer for tRPC Cloud API.
 * Data passes through unchanged on both serialization and deserialization.
 * Used because tRPC v11's fetch adapter doesn't apply the transformer
 * to POST mutation bodies, only to GET query params.
 */
export const cloudTransformer = {
  serialize: (object: unknown) => object,
  deserialize: (object: unknown) => object,
};
