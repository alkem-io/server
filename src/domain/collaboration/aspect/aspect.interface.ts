import { IVisual } from '@domain/common/visual/visual.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { ICardProfile } from '../card-profile/card.profile.interface';

@ObjectType('Aspect')
export abstract class IAspect extends INameable {
  @Field(() => String, {
    description:
      'The aspect type, e.g. knowledge, idea, stakeholder persona etc.',
  })
  type!: string;

  profile?: ICardProfile;

  // Expose the date at which the aspect was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  banner?: IVisual;
  bannerNarrow?: IVisual;

  comments?: IComments;
}
