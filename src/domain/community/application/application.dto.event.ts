import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class ApplicationEventInput {
  @Field(() => UUID, { nullable: false })
  applicationID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;
}
