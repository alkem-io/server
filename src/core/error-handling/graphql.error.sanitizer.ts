import { AlkemioErrorStatus } from '@common/enums';
import { GraphQLFormattedError } from 'graphql';

const SAFE_EXTENSION_KEYS = [
  'code',
  'numericCode',
  'userMessage',
  'errorId',
] as const;

/**
 * GraphQL builds variable-coercion messages by inspecting the rejected value.
 * For opaque, potentially large inputs that reflects user content back to the
 * browser before a resolver or exception filter runs. Replace that framework
 * wrapper at the response boundary while preserving the stable error metadata.
 */
export const sanitizeGraphQLFormattedError = (
  error: GraphQLFormattedError
): GraphQLFormattedError => {
  if (
    error.extensions?.code !== AlkemioErrorStatus.BAD_USER_INPUT ||
    !/^Variable\s+.+\s+got invalid value\b/s.test(error.message)
  ) {
    return error;
  }

  const extensions: Record<string, unknown> = {};
  for (const key of SAFE_EXTENSION_KEYS) {
    const value = error.extensions?.[key];
    if (value !== undefined) {
      extensions[key] = value;
    }
  }

  return {
    message: 'Invalid value supplied for a GraphQL variable',
    locations: error.locations,
    path: error.path,
    extensions,
  };
};
