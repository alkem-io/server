import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.create';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { SpaceLevel } from '@common/enums/space.level';
import { CreateSpaceSettingsInput } from '@domain/space/space.settings/dto/space.settings.dto.create';

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

  @Field(() => SpaceLevel, { nullable: false })
  level!: SpaceLevel;
}
