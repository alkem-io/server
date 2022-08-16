import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IsOptional } from 'class-validator';

@InputType()
export class CreateChallengeInput extends CreateBaseChallengeInput {
  @Field(() => [UUID_NAMEID], {
    nullable: true,
    description: 'Set lead Organizations for the Challenge.',
  })
  @IsOptional()
  leadOrganizations?: string[];

  @Field(() => UUID, { nullable: false })
  lifecycleID!: string;
}
