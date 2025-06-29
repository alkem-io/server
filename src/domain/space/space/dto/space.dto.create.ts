import { Field, InputType } from '@nestjs/graphql';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCollaborationOnSpaceInput } from './space.dto.create.collaboration';
import { SpaceLevel } from '@common/enums/space.level';
import { CreateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateSpaceSettingsInput } from '@domain/space/space.settings';

@InputType()
export class CreateSpaceInput {
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field(() => CreateSpaceAboutInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateSpaceAboutInput)
  about!: CreateSpaceAboutInput;

  @Field(() => CreateCollaborationOnSpaceInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateCollaborationOnSpaceInput)
  collaborationData!: CreateCollaborationOnSpaceInput;

  @Field(() => CreateSpaceSettingsInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateSpaceSettingsInput)
  settings?: CreateSpaceSettingsInput;

  // For passing on the hierarchy of storage aggregators
  storageAggregatorParent?: IStorageAggregator;

  level!: SpaceLevel;

  @Field(() => UUID, {
    nullable: true,
    description: 'The Template to use for instantiating the Collaboration.',
  })
  @IsOptional()
  spaceTemplateID?: string;
}
