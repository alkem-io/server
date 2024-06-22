import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';

@InputType()
export class UpdateEcosystemModelInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
