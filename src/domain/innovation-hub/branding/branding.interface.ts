import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IVisual } from '@domain/common/visual';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Branding')
export class IBranding extends BaseAlkemioEntity {
  @Field(() => IVisual, {
    description: 'The logo of this instance of branding',
  })
  logo!: IVisual;

  @Field(() => String, {
    description: 'The style configuration',
    nullable: true,
  })
  styles?: string;
}
