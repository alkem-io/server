import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CardProfile')
export abstract class ICardProfile extends IAuthorizable {
  references?: IReference[];

  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the Aspect',
  })
  tagset?: ITagset;

  @Field(() => Markdown, {
    description: 'The description of this aspect',
  })
  description!: string;
}
