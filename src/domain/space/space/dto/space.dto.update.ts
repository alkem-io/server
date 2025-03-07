import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';

@InputType()
export class UpdateSpaceInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateSpaceAboutInput, {
    nullable: true,
    description: 'Update the Space About information.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSpaceAboutInput)
  about?: UpdateSpaceAboutInput;
}
