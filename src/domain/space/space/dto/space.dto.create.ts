import { Field, InputType } from '@nestjs/graphql';
import { SpaceType } from '@common/enums/space.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';
import { CreateNameableOptionalInput } from '@domain/common/entity/nameable-entity/dto/nameable.optional.dto.create';

@InputType()
export class CreateSpaceInput extends CreateNameableOptionalInput {
  @Field(() => CreateContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContextInput)
  context?: CreateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => CreateCollaborationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCollaborationInput)
  collaborationData?: CreateCollaborationInput;

  // For passing on the hierarchy of storage aggregators
  storageAggregatorParent?: IStorageAggregator;

  level!: number;

  @Field(() => SpaceType, { nullable: true })
  @IsOptional()
  type!: SpaceType;
}
