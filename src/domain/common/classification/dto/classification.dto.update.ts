import { UpdateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
@InputType()
export class UpdateClassificationInput {
  @Field(() => [UpdateTagsetInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTagsetInput)
  tagsets?: UpdateTagsetInput[];
}
