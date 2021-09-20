import { BaseChallengeEventInput } from '@domain/challenge/base-challenge/base.challenge.dto.event';
import { InputType } from '@nestjs/graphql';
@InputType()
export class OpportunityEventInput extends BaseChallengeEventInput {}
