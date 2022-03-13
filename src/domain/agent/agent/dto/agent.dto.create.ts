import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateAgentInput {
  parentDisplayID!: string;
}
