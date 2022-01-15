import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateVisualInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: false })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  uri?: string;
}
