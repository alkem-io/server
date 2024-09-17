import { Field, InputType } from '@nestjs/graphql';
import { UpdateCalloutInput } from './callout.dto.update';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateCalloutEntityInput extends UpdateCalloutInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
