import { registerEnumType } from '@nestjs/graphql';

export enum SpaceType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  KNOWLEDGE = 'knowledge',
  BLANK_SLATE = 'blank-slate',
}

registerEnumType(SpaceType, {
  name: 'SpaceType',
});
