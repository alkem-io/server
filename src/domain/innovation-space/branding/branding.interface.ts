import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Branding')
export class IBranding extends BaseAlkemioEntity {
  @Field(() => String, {
    description: 'The style configuration',
    nullable: true,
  })
  styles?: string;
}
