import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { ICommunity } from '@domain/community/community';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IProfile } from '@domain/common/profile';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ITemplate } from '@domain/template/template/template.interface';
import { ISpaceAbout } from '@domain/space/space.about';

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
