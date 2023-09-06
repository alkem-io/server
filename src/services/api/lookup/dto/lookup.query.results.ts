import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard';
import { ICommunity } from '@domain/community/community';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IContext } from '@domain/context';
import { IProfile } from '@domain/common/profile';
import { ICallout } from '@domain/collaboration/callout';
import { IRoom } from '@domain/communication/room/room.interface';
import { IInnovationFlow } from '@domain/challenge/innovation-flow/innovation.flow.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { IInnovationFlowTemplate } from '@domain/template/innovation-flow-template/innovation.flow.template.interface';
import { IWhiteboardRt } from '@domain/common/whiteboard-rt/types';

@ObjectType()
export class LookupQueryResults {
  // exposed through the field resolver
  community!: ICommunity;
  collaboration!: ICollaboration;
  context!: IContext;
  profile!: IProfile;
  callout!: ICallout;
  post!: IPost;
  room!: IRoom;
  innovationFlow!: IInnovationFlow;
  InnovationFlowTemplate!: IInnovationFlowTemplate;
  whiteboard!: IWhiteboard;
  whiteboardRt!: IWhiteboardRt;
  whiteboardTemplate!: IWhiteboardTemplate;
}
