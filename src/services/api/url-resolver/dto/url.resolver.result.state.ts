import { registerEnumType } from '@nestjs/graphql';

export enum UrlResolverResultState {
  RESOLVED = 'RESOLVED',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
}

registerEnumType(UrlResolverResultState, {
  name: 'UrlResolverResult',
});
