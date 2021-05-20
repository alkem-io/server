import { CreateIdentifiableInput } from '@domain/common/identifiable-entity';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH } from '@src/common/constants';

import { MaxLength } from 'class-validator';

@InputType()
export class CreateProjectInput extends CreateIdentifiableInput {
  @Field({ nullable: false })
  opportunityID!: number;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;
}
