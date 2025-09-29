import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorInteractionMode {
  DISCUSSION_TAGGING = 'discussion-tagging',
}

registerEnumType(VirtualContributorInteractionMode, {
  name: 'VirtualContributorInteractionMode',
});
