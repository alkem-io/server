import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';

@InputType()
@ObjectType('CreateClassificationData')
export class CreateClassificationInput {
  @Field(() => [CreateTagsetInput], { nullable: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTagsetInput)
  tagsets!: CreateTagsetInput[];
}
