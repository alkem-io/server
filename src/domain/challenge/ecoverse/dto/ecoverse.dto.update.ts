import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateAuthorizationPolicyInput } from '@domain/common/authorization-policy';
import { UpdateHubTemplateInput } from './ecoverse.dto.update.template';

@InputType()
export class UpdateEcoverseInput extends UpdateBaseChallengeInput {
  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the host Organization for the Ecoverse.',
  })
  @IsOptional()
  hostID?: string;

  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Ecoverse.',
  })
  ID!: string;

  @Field(() => UpdateAuthorizationPolicyInput, {
    nullable: true,
    description: 'Update anonymous visibility for the Ecoverse.',
  })
  @IsOptional()
  authorizationPolicy?: UpdateAuthorizationPolicyInput;

  @Field(() => UpdateHubTemplateInput, {
    nullable: true,
    description: 'Update the template for this Hub.',
  })
  @IsOptional()
  template?: UpdateHubTemplateInput;
}
