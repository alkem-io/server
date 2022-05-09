import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { CreateTagsetInput } from '@domain/common/tagset';

@InputType()
export class CreateTagsetOnProfileInput extends CreateTagsetInput {
  @Field(() => UUID, { nullable: true })
  profileID!: string;
}
