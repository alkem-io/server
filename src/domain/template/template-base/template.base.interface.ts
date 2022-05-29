import { ITagset } from '@domain/common';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ITemplateBase')
export abstract class ITemplateBase extends IBaseAlkemio {
  @Field(() => String, {
    nullable: true,
    description: 'The title for this Template.',
  })
  title!: string;

  @Field(() => String, {
    nullable: true,
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
