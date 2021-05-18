import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge';

@InputType()
export class UpdateEcoverseInput extends UpdateBaseChallengeInput {
  @Field({
    nullable: true,
    description: 'The host Organisation for the ecoverse',
  })
  @IsOptional()
  hostID?: string;
}
