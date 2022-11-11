import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@ObjectType('TemplateInfo')
export abstract class ITemplateInfo extends IBaseAlkemio {
  @Field(() => String, {
    nullable: false,
    description: 'The title for this Template.',
  })
  title!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The description for this Template.',
  })
  description!: string;

  @Field(() => ITagset, {
    nullable: true,
    description: 'The tags set on this Template.',
  })
  tagset!: ITagset;

  @Field(() => IVisual, {
    nullable: true,
    description: 'The image associated with this Template`.',
  })
  visual?: IVisual;
}
