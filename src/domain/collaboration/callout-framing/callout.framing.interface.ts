import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@ObjectType('CalloutFraming')
export abstract class ICalloutFraming extends IAuthorizable {
  profile!: IProfile;

  @Field(() => WhiteboardContent, {
    nullable: true,
    description: 'The whiteboard template content for this Callout Framing.',
  })
  content?: string;
}
