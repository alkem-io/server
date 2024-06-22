import { registerEnumType } from '@nestjs/graphql';

export enum AccountRole {
  HOST = 'host',
}

registerEnumType(AccountRole, {
  name: 'AccountRole',
});
