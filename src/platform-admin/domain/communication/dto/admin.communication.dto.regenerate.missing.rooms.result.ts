import { RoomType } from '@common/enums/room.type';
import { UUID } from '@domain/common/scalars';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum CommunicationAdminRoomRegenerationOutcome {
  REGENERATED = 'regenerated',
  ALREADY_EXISTED = 'already-existed',
  FAILED = 'failed',
}

registerEnumType(CommunicationAdminRoomRegenerationOutcome, {
  name: 'CommunicationAdminRoomRegenerationOutcome',
  description:
    'What happened to a Room during a regenerate-missing-rooms pass.',
});

@ObjectType()
export class CommunicationAdminRoomRegenerationResult {
  @Field(() => UUID, { description: 'The ID of the Room.' })
  roomID!: string;

  @Field(() => RoomType, {
    nullable: true,
    description: 'The type of the Room; null when the Room was not found.',
  })
  type?: RoomType;

  @Field(() => CommunicationAdminRoomRegenerationOutcome, {
    description: 'The outcome for this Room.',
  })
  outcome!: CommunicationAdminRoomRegenerationOutcome;

  @Field(() => String, {
    nullable: true,
    description: 'Why the Room could not be regenerated, when it failed.',
  })
  error?: string;
}

@ObjectType()
export class CommunicationAdminRegenerateMissingRoomsResult {
  @Field(() => Int, {
    description:
      'Number of Rooms whose room on the messaging platform was missing and has been created.',
  })
  regenerated = 0;

  @Field(() => Int, {
    description:
      'Number of Rooms that already had a room on the messaging platform.',
  })
  alreadyExisted = 0;

  @Field(() => Int, {
    description: 'Number of Rooms that could not be regenerated.',
  })
  failed = 0;

  @Field(() => Boolean, {
    description:
      'True when the pass stopped early because the messaging platform could not be reached; the remaining Rooms were not checked.',
  })
  aborted = false;

  @Field(() => [CommunicationAdminRoomRegenerationResult], {
    description:
      'Per-Room outcome for every Room examined individually: all requested Rooms when roomIDs is given, otherwise the Rooms the messaging platform did not list.',
  })
  rooms: CommunicationAdminRoomRegenerationResult[] = [];
}
