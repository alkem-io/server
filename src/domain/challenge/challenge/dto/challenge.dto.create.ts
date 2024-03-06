import { NameID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IsOptional, ValidateNested } from 'class-validator';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { Type } from 'class-transformer';

@InputType()
export class CreateChallengeInput extends CreateBaseChallengeInput {
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: 'Set lead Organizations for the Challenge.',
  })
  @IsOptional()
  leadOrganizations?: string[];

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field(() => CreateCollaborationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCollaborationInput)
  collaborationData?: CreateCollaborationInput;

  storageAggregatorParent!: IStorageAggregator;
  spaceID = 'not defined';
}
