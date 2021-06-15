import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateAuthorizationDefinitionInput } from '@domain/common/authorization-definition';

@InputType()
export class UpdateEcoverseInput extends UpdateBaseChallengeInput {
  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organisation for the Ecoverse.',
  })
  @IsOptional()
  hostID?: string;

  @Field(() => UpdateAuthorizationDefinitionInput, {
    nullable: true,
    description: 'Update anonymous visibility for the Ecoverse.',
  })
  @IsOptional()
  authorizationDefinition?: UpdateAuthorizationDefinitionInput;
}
