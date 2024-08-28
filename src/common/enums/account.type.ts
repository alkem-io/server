import { registerEnumType } from '@nestjs/graphql';

export enum AccountType {
  USER = 'user',
  ORGANIZATION = 'organization',
}

registerEnumType(AccountType, {
  name: 'AccountType',
});
