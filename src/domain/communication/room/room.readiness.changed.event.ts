import { RoomReadinessRecord } from './dto/room.readiness';
import { IRoom } from './room.interface';

export const ROOM_READINESS_CHANGED_EVENT = 'room.readiness.changed';

/**
 * Emitted by RoomReadinessService after a readiness write that changed the
 * state or the reason of a room. Listeners that know which conversation owns
 * the room (the room module does not) translate it into governance events.
 */
export class RoomReadinessChangedEvent {
  constructor(
    public readonly room: IRoom,
    public readonly previous: RoomReadinessRecord | undefined,
    public readonly current: RoomReadinessRecord
  ) {}
}
