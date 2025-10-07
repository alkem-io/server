import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AiServerIngestAiPersonaInput {
  @Field(() => UUID, { nullable: false })
  aiPersonaID!: string;
}
