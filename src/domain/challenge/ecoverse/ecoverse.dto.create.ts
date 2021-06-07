import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class CreateEcoverseInput extends CreateBaseChallengeInput {
  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'The host Organisation for the ecoverse',
  })
  @IsOptional()
  hostID?: string;
}
