import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
@ObjectType('CreatePostData')
export class CreatePostInput extends CreateNameableInput {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
