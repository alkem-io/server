import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';
import { Type } from 'class-transformer';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@InputType()
export class CreateBaseChallengeInput extends CreateNameableInput {
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
}
