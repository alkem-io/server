import { registerEnumType } from '@nestjs/graphql';

export enum TemplateType {
  CALLOUT = 'callout',
  POST = 'post',
  WHITEBOARD = 'whiteboard',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  SPACE = 'space',
  CLASSIFICATION = 'classification',
}

registerEnumType(TemplateType, {
  name: 'TemplateType',
});
