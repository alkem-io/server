import { InputType } from '@nestjs/graphql';
import { BaseChallengeEventInput } from '@domain/challenge/base-challenge';

@InputType()
export class ChallengeEventInput extends BaseChallengeEventInput {}
