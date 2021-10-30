import { Entity } from 'typeorm';
import { IUpdates } from './updates.interface';
import { RoomableEntity } from '../room/roomable.entity';

@Entity()
export class Updates extends RoomableEntity implements IUpdates {
  constructor(communicationGroupID: string, displayName: string) {
    super(communicationGroupID, displayName);
  }
}
