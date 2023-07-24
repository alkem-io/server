import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard';
import { ICommunity } from '@domain/community/community';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IContext } from '@domain/context';

@ObjectType()
export class LookupQueryResults {
  // exposed through the field resolver
  whiteboard!: IWhiteboard;
  community!: ICommunity;
  collaboration!: ICollaboration;
  context!: IContext;

  // Profile
  // Callout
  // Post
  // Room
  // InnovationFlow
  // WhiteboardTemplate
  // InnovationFlowTemplate
}
