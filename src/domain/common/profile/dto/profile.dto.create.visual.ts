import { VisualType } from '@common/enums/visual.type';
import { InputType, Field, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateVisualOnProfile')
export class CreateVisualOnProfileInput {
  @Field(() => VisualType, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  uri?: string;
}
