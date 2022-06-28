import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { UUID_NAMEID } from '@domain/common/scalars';

@InputType()
export class UpdateHubInput extends UpdateBaseChallengeInput {
  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization for the Hub.',
  })
  @IsOptional()
  hostID?: string;

  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Hub.',
  })
  ID!: string;
}
