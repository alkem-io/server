import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity';
import { UUID_NAMEID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH } from '@src/common/constants';

import { MaxLength } from 'class-validator';

@InputType()
export class CreateProjectInput extends CreateNameableInputOld {
  @Field(() => UUID_NAMEID, { nullable: false })
  opportunityID!: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
