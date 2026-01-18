import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

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
