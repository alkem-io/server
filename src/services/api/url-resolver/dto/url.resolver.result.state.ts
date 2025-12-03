import { registerEnumType } from '@nestjs/graphql';

export enum UrlResolverResultState {
  Resolved = 'RESOLVED',
  NotFound = 'NOT_FOUND',
  Forbidden = 'FORBIDDEN',
}

registerEnumType(UrlResolverResultState, {
  name: 'UrlResolverResultState',
});
