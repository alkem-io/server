import { registerEnumType } from '@nestjs/graphql';

export enum SpaceType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  VIRTUAL_CONTRIBUTOR = 'vc',
  BLANK_SLATE = 'blank-slate',
}

registerEnumType(SpaceType, {
  name: 'SpaceType',
});
