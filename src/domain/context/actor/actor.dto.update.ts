import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateActorInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  value?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  impact?: string;
}
