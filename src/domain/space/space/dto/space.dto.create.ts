import { Field, InputType } from '@nestjs/graphql';
import { SpaceType } from '@common/enums/space.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { CreateCollaborationOnSpaceInput } from './space.dto.create.collaboration';
import { SpaceLevel } from '@common/enums/space.level';

@InputType()
export class CreateSpaceInput extends CreateNameableInput {
  @Field(() => CreateContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContextInput)
  context?: CreateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => CreateCollaborationOnSpaceInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateCollaborationOnSpaceInput)
  collaborationData!: CreateCollaborationOnSpaceInput;

  // For passing on the hierarchy of storage aggregators
  storageAggregatorParent?: IStorageAggregator;

  level!: SpaceLevel;

  @Field(() => SpaceType, { nullable: true })
  @IsOptional()
  type!: SpaceType;
}
