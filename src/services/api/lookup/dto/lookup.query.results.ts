import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { ICommunity } from '@domain/community/community';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IContext } from '@domain/context';
import { IProfile } from '@domain/common/profile';
import { ICallout } from '@domain/collaboration/callout';
import { IRoom } from '@domain/communication/room/room.interface';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ITemplate } from '@domain/template/template/template.interface';

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
  template!: ITemplate;
  whiteboard!: IWhiteboard;
}
