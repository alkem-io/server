import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateCanvasOnContextInput {
  @Field(() => UUID, { nullable: false })
  contextID!: string;

  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value?: string;
}
