import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunicationAdminReconcileConversationRoomsInput {
  @Field(() => Boolean, {
    nullable: false,
    defaultValue: false,
    description:
      'Also repair conversation rooms the backend does not have (re-create under the same room id and converge membership). Rooms of other kinds are only marked.',
  })
  repair!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: false,
    description:
      'Probe every room, including rooms already recorded READY. By default only rooms whose readiness is not READY are probed.',
  })
  includeReady!: boolean;
}
