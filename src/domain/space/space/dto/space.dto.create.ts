import { Field, InputType } from '@nestjs/graphql';
import { SpaceType } from '@common/enums/space.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCollaborationOnSpaceInput } from './space.dto.create.collaboration';
import { SpaceLevel } from '@common/enums/space.level';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { CreateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';

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

  // For passing on the hierarchy of storage aggregators
  storageAggregatorParent?: IStorageAggregator;
  // For accessing the default templates of the parent space
  templatesManagerParent?: ITemplatesManager;

  level!: SpaceLevel;

  // TODO: this needs to be replaced with a different way to select the template
  @Field(() => SpaceType, { nullable: true })
  @IsOptional()
  type!: SpaceType;
}
