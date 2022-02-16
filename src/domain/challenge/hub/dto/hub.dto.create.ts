import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class CreateHubInput extends CreateBaseChallengeInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The host Organization for the hub',
  })
  hostID!: string;
}
