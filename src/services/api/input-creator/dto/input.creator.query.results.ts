import { ObjectType } from '@nestjs/graphql';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';

@ObjectType()
export class InputCreatorQueryResults {
  // exposed through the field resolver
  communityGuidelinesInput!: CreateCommunityGuidelinesInput;
  callout!: CreateCalloutInput;
  innovationFlow!: CreateInnovationFlowInput;
  whiteboard!: CreateWhiteboardInput;
}
