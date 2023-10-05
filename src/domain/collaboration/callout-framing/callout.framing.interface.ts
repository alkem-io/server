import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IWhiteboardRt } from '@domain/common/whiteboard-rt/whiteboard.rt.interface';

@ObjectType('CalloutFraming')
export abstract class ICalloutFraming extends IAuthorizable {
  profile!: IProfile;

  @Field(() => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for this Callout Framing.',
  })
  whiteboard?: IWhiteboard;

  @Field(() => IWhiteboardRt, {
    nullable: true,
    description: 'The WhiteboardRT for this Callout Framing.',
  })
  whiteboardRt?: IWhiteboardRt;
}
