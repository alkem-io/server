import { Field, InputType } from '@nestjs/graphql';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.create';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { SpaceLevel } from '@common/enums/space.level';
import { CreateSpaceSettingsInput } from '@domain/space/space.settings/dto/space.settings.dto.create';

@InputType()
export class CreateTemplateContentSpaceInput {
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

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

  // For passing on the hierarchy of storage aggregators
  storageAggregatorParent?: IStorageAggregator;

  level!: SpaceLevel;
}
