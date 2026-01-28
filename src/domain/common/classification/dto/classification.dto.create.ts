import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateClassificationData')
export class CreateClassificationInput {
  @Field(() => [CreateTagsetInput], { nullable: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTagsetInput)
  tagsets!: CreateTagsetInput[];
}
