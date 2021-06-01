import { InputType } from '@nestjs/graphql';
import { UpdateBaseChallengeInput } from '../base-challenge';

@InputType()
export class UpdateChallengeInput extends UpdateBaseChallengeInput {}
