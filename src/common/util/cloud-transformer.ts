/**
 * No-op (identity) transformer for tRPC Cloud API (client-side).
 * Data passes through unchanged on both serialization and deserialization.
 */
const identityTransformer = {
  serialize: (object: unknown) => object,
  deserialize: (object: unknown) => object,
} as const;
export { identityTransformer as cloudTransformerClient };
