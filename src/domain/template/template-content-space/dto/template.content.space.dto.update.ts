import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';
import { UpdateSpaceSettingsEntityInput } from '@domain/space/space.settings/dto/space.settings.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateTemplateContentSpaceInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateSpaceAboutInput, {
    nullable: true,
    description: 'Update the TemplateContentSpace About information.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSpaceAboutInput)
  about?: UpdateSpaceAboutInput;

  @Field(() => UpdateSpaceSettingsEntityInput, {
    nullable: false,
    description: 'Update the settings for the Space.',
  })
  @ValidateNested()
  @Type(() => UpdateSpaceSettingsEntityInput)
  settings!: UpdateSpaceSettingsEntityInput;
}
