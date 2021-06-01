import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '../../common/scalars/scalar.uuid';
import { CreateTagsetInput } from '../../common/tagset/tagset.dto.create';

@InputType()
export class CreateTagsetOnProfileInput extends CreateTagsetInput {
  @Field(() => UUID, { nullable: true })
  profileID!: string;
}
