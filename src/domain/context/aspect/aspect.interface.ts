import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IComments } from '@domain/communication/comments/comments.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@ObjectType('Aspect')
export abstract class IAspect extends IAuthorizable {
  @Field(() => String, {
    nullable: false,
    description: 'The display name.',
  })
  displayName!: string;

  @Field(() => NameID, {
    nullable: true,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID?: string;

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

  // Expose the date at which the aspect was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  banner?: IVisual;
  bannerNarrow?: IVisual;

  comments?: IComments;

  references?: IReference[];
}
