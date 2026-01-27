import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateCalloutInput } from './callout.dto.update';

@InputType()
export class UpdateCalloutEntityInput extends UpdateCalloutInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
