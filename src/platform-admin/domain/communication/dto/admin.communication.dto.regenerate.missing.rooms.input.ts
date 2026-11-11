import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminRegenerateMissingRoomsInput {
  @Field(() => [UUID], {
    nullable: true,
    description:
      'Limit the pass to these Rooms. When omitted, every Room is checked against the rooms known to the messaging platform.',
  })
  roomIDs?: string[];
}
