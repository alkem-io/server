import { InputType } from '@nestjs/graphql';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';

@InputType()
export class UpdateOpportunityInput extends UpdateBaseChallengeInput {}
