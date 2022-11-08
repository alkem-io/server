import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { INameable } from '@domain/common/entity/nameable-entity';
import { ICallout } from '@domain/collaboration/callout';

@ObjectType('Aspect')
export abstract class IAspect extends INameable {
  @Field(() => Markdown, {
    description: 'The description of this aspect',
  })
  description!: string;

  @Field(() => String, {
    description:
      'The aspect type, e.g. knowledge, idea, stakeholder persona etc.',
  })
  type!: string;

  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the Aspect',
  })
  tagset?: ITagset;

  @Field(() => ICallout, {
    nullable: true,
    description: 'The parent Callout of the Aspect',
  })
  callout?: ICallout;

  // Expose the date at which the aspect was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  banner?: IVisual;
  bannerNarrow?: IVisual;

  comments?: IComments;

  references?: IReference[];
}
