import { registerEnumType } from '@nestjs/graphql';

export enum TemplateType {
  CALLOUT = 'callout',
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  INNOVATION_FLOW = 'innovation-flow',
}

registerEnumType(TemplateType, {
  name: 'TemplateType',
});
