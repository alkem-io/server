import { ENUM_LENGTH } from '@common/constants';
import { RoomType } from '@common/enums/room.type';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { VcInteractionsByThread } from '../vc-interaction/vc.interaction.entity';
import { IRoom } from './room.interface';

// Shape of the vcData JSONB column in the room table.
// vcInteractionsByThread is stored as a sub-field to allow future extension.
type VcData = { interactionsByThread?: VcInteractionsByThread };

@Entity()
export class Room extends AuthorizableEntity implements IRoom {
  @Column('int', { nullable: false })
  messagesCount!: number;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: RoomType;

  @Column()
  displayName!: string;

  // The actual DB column – holds vcInteractionsByThread nested under interactionsByThread key
  @Column('jsonb', { default: {} })
  vcData!: VcData;

  // Transparent getter/setter so all existing code continues to work unchanged.
  // Getter always initialises the nested map so callers can safely mutate the returned reference.
  get vcInteractionsByThread(): VcInteractionsByThread {
    if (!this.vcData) this.vcData = {};
    if (!this.vcData.interactionsByThread)
      this.vcData.interactionsByThread = {};
    return this.vcData.interactionsByThread;
  }

  set vcInteractionsByThread(value: VcInteractionsByThread) {
    if (!this.vcData) this.vcData = {};
    this.vcData.interactionsByThread = value;
  }

  @OneToOne(
    () => Callout,
    callout => callout.comments
  )
  callout?: Callout;

  @OneToOne(
    () => Post,
    post => post.comments
  )
  post?: Post;

  constructor(displayName: string, type: RoomType) {
    super();
    this.type = type;
    this.displayName = displayName;
    this.messagesCount = 0;
    this.vcData = {};
  }
}
