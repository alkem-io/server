import { registerEnumType } from '@nestjs/graphql';

export enum UrlResolverResultState {
  RESOLVED = 'RESOLVED',
  ERROR = 'ERROR',
}

registerEnumType(UrlResolverResultState, {
  name: 'UrlResolverResultState',
});
