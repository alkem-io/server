import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IWhiteboardRt } from '@domain/common/whiteboard-rt/whiteboard.rt.interface';

@ObjectType('CalloutFraming')
export abstract class ICalloutFraming extends IAuthorizable {
  profile!: IProfile;

  whiteboard?: IWhiteboard;

  whiteboardRt?: IWhiteboardRt;
}
