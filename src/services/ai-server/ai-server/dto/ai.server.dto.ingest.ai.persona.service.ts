import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AiServerIngestAiPersonaServiceInput {
  @Field(() => UUID, { nullable: false })
  aiPersonaServiceID!: string;
}
