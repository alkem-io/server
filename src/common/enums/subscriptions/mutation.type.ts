import { registerEnumType } from '@nestjs/graphql';

export enum MutationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

registerEnumType(MutationType, {
  name: 'MutationType',
});
