import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateCommunityGuidelinesInput } from './community.guidelines.dto.update';

@InputType()
export class UpdateCommunityGuidelinesEntityInput extends UpdateCommunityGuidelinesInput {
  @Field(() => UUID, {
    description: 'ID of the CommunityGuidelines',
  })
  @IsOptional()
  communityGuidelinesID!: string;
}
