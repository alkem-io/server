import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { CreateNameableOptionalInput } from '@domain/common/entity/nameable-entity/dto/nameable.optional.dto.create';

@InputType()
export class CreatePostInput extends CreateNameableOptionalInput {
  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
