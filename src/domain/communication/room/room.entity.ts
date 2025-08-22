import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { IRoom } from './room.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { RoomType } from '@common/enums/room.type';
import { VcInteraction } from '../vc-interaction/vc.interaction.entity';
import { ENUM_LENGTH } from '@common/constants';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';

@Entity()
export class Room extends AuthorizableEntity implements IRoom {
  @Column()
  externalRoomID!: string;

  @Column('int', { nullable: false })
  messagesCount!: number;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: RoomType;

  @Column()
  displayName!: string;

  @OneToMany(
    () => VcInteraction,
    (interaction: VcInteraction) => interaction.room,
    {
      eager: false,
      cascade: true,
    }
  )
  vcInteractions?: VcInteraction[];

  @OneToOne(() => Callout, callout => callout.comments)
  callout?: Callout;

  @OneToOne(() => Post, post => post.comments)
  post?: Post;

  constructor(displayName: string, type: RoomType) {
    super();
    this.type = type;
    this.displayName = displayName;
    this.messagesCount = 0;
  }
}
