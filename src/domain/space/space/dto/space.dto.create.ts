import { Field, InputType } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { SpaceType } from '@common/enums/space.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';

@InputType()
export class CreateSpaceInput extends CreateNameableInput {
  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing Account.',
  })
  nameID!: string;

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

  type!: SpaceType;
}
