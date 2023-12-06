import { registerEnumType } from '@nestjs/graphql';

export enum JourneyTypeEnum {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

registerEnumType(JourneyTypeEnum, {
  name: 'JourneyType',
});
