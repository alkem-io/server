import { InputType } from '@nestjs/graphql';
import { BaseChallengeEventInput } from '@domain/challenge/base-challenge/base.challenge.dto.event';

@InputType()
export class ChallengeEventInput extends BaseChallengeEventInput {}
