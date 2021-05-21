import { CreateNameableInput } from '@domain/common/nameable-entity';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH } from '@src/common/constants';

import { MaxLength } from 'class-validator';

@InputType()
export class CreateProjectInput extends CreateNameableInput {
  @Field({ nullable: false })
  opportunityID!: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;
}
