import { registerEnumType } from '@nestjs/graphql';

export enum AiPersonaInteractionMode {
  DISCUSSION_TAGGING = 'discussion-tagging',
}

registerEnumType(AiPersonaInteractionMode, {
  name: 'AiPersonaInteractionMode',
});
