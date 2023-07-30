import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';
import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';

@InputType()
export class CreateLinkOnCalloutInput extends CreateReferenceInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;
}
