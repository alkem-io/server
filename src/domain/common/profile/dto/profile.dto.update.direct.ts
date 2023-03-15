import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { UpdateProfileInput } from './profile.dto.update';

@InputType()
export class UpdateProfileDirectInput extends UpdateProfileInput {
  @Field(() => UUID, { nullable: false })
  profileID!: string;
}
