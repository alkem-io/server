import { NameID, UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IsOptional } from 'class-validator';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@InputType()
export class CreateChallengeInput extends CreateBaseChallengeInput {
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: 'Set lead Organizations for the Challenge.',
  })
  @IsOptional()
  leadOrganizations?: string[];

  @Field(() => UUID, {
    nullable: true,
    description: 'The Innovation Flow template to use for the Challenge.',
  })
  innovationFlowTemplateID?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  storageBucketParent!: IStorageBucket;
}
