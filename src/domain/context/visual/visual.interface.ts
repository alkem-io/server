import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Visual')
export abstract class IVisual extends IBaseAlkemio {
  @Field(() => String, {
    nullable: false,
    description: 'The avatar (logo) to be used.',
  })
  avatar!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The background image to be used, for example when displaying previews.',
  })
  background!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The banner to be shown at the top of the page.',
  })
  banner!: string;
}
