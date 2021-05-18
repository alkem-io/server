import { InputType } from '@nestjs/graphql';
import { BaseChallengeEventInput } from '../base-challenge/base.challenge.dto.event';

@InputType()
export class ChallengeEventInput extends BaseChallengeEventInput {}
