import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.update';
import { Type } from 'class-transformer';
@InputType()
export class UpdateClassificationInput {
  @Field(() => [UpdateTagsetInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTagsetInput)
  tagsets?: UpdateTagsetInput[];
}
