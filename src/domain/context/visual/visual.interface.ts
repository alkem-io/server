import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Visual')
export abstract class IVisual extends IBaseCherrytwist {
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
