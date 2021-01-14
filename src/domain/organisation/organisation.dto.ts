import { Field, InputType } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@constants';
import { MaxLength } from 'class-validator';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true, description: 'The name for this organisation' })
  @MaxLength(MID_TEXT_LENGTH)
  name!: string;
}
