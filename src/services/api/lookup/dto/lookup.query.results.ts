import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { IProfile } from '@domain/common/profile';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { IRoom } from '@domain/communication/room/room.interface';
import { ICommunity } from '@domain/community/community';
import { ISpaceAbout } from '@domain/space/space.about';
import { ITemplate } from '@domain/template/template/template.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LookupQueryResults {
  // exposed through the field resolver
  community!: ICommunity;
  collaboration!: ICollaboration;
  spaceAbout!: ISpaceAbout;
  profile!: IProfile;
  callout!: ICallout;
  post!: IPost;
  room!: IRoom;
  innovationFlow!: IInnovationFlow;
  template!: ITemplate;
  whiteboard!: IWhiteboard;
}
