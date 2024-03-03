import { NameID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IsOptional } from 'class-validator';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

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

  storageAggregatorParent!: IStorageAggregator;
  spaceID = 'not defined';
}
