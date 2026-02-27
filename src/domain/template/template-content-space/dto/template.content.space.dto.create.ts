import { SpaceLevel } from '@common/enums/space.level';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { CreateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.create';
import { CreateSpaceSettingsInput } from '@domain/space/space.settings/dto/space.settings.dto.create';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class CreateTemplateContentSpaceInput {
  @Field(() => CreateSpaceSettingsInput, {
    nullable: false,
    description: 'Create the settings for the Space.',
  })
  @ValidateNested()
  @Type(() => CreateSpaceSettingsInput)
  settings!: CreateSpaceSettingsInput;

  @Field(() => CreateSpaceAboutInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateSpaceAboutInput)
  about!: CreateSpaceAboutInput;

  @Field(() => CreateCollaborationInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateCollaborationInput)
  collaborationData!: CreateCollaborationInput;

  @Field(() => [CreateTemplateContentSpaceInput], { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTemplateContentSpaceInput)
  subspaces!: CreateTemplateContentSpaceInput[];

  @Field(() => SpaceLevel, { nullable: false })
  level!: SpaceLevel;
}
