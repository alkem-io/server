import { Field, InputType } from '@nestjs/graphql';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { IsOptional } from 'class-validator';
import { UUID_NAMEID } from '@domain/common/scalars';

@InputType()
export class UpdateChallengeInput extends UpdateBaseChallengeInput {
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: 'Update the lead Organisations for the Challenge.',
  })
  @IsOptional()
  leadOrganisations?: string[];
}
