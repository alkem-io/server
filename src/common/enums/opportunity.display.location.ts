import { registerEnumType } from '@nestjs/graphql';

export enum OpportunityDisplayLocation {
  HOME_TOP = 'HOME_0',
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  CONTRIBUTE = 'CONTRIBUTE_1',
  CONTRIBUTE_RIGHT = 'CONTRIBUTE_2',
  KNOWEDGE_RIGHT = 'KNOWLEDGE',
}

registerEnumType(OpportunityDisplayLocation, {
  name: 'OpportunityDisplayLocation',
});
