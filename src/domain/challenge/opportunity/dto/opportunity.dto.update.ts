import { InputType } from '@nestjs/graphql';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.update';

@InputType()
export class UpdateOpportunityInput extends UpdateBaseChallengeInput {}
