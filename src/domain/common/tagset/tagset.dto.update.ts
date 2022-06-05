import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
@InputType()
export class UpdateTagsetInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
