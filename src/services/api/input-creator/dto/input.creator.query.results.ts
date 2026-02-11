import { CreateCalloutInput } from '@domain/collaboration/callout/dto';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InputCreatorQueryResults {
  // exposed through the field resolver
  communityGuidelinesInput!: CreateCommunityGuidelinesInput;
  callout!: CreateCalloutInput;
  innovationFlow!: CreateInnovationFlowInput;
  whiteboard!: CreateWhiteboardInput;
}
