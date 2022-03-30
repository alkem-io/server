import { registerEnumType } from '@nestjs/graphql';

export enum SsiIssuerType {
  JOLOCOM = 'jolocom',
  SOVRHD = 'sovrhd',
}

registerEnumType(SsiIssuerType, {
  name: 'SsiIssuerType',
});
