import { registerEnumType } from '@nestjs/graphql';

export enum ActorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL = 'virtual',
  SPACE = 'space',
  ACCOUNT = 'account',
}

registerEnumType(ActorType, {
  name: 'ActorType',
  description:
    'The type of Actor - determines which entity table the actor belongs to.',
});
