import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout';
import { IProfile } from '@domain/common/profile/profile.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';

@ObjectType('Aspect')
export abstract class IAspect extends INameable {
  @Field(() => String, {
    description:
      'The aspect type, e.g. knowledge, idea, stakeholder persona etc.',
  })
  type!: string;

  profile!: IProfile;

  @Field(() => ICallout, {
    nullable: true,
    description: 'The parent Callout of the Aspect',
  })
  callout?: ICallout;

  // Expose the date at which the aspect was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  comments?: IComments;
}
