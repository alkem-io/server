import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreatePostInput extends CreateNameableInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
