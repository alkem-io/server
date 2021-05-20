import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge';

@InputType()
export class CreateEcoverseInput extends CreateBaseChallengeInput {
  @Field({
    nullable: true,
    description: 'The host Organisation for the ecoverse',
  })
  @IsOptional()
  hostID?: string;
}
