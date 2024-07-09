import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IVcInteraction } from './vc.interaction.interface';
import { Room } from '../room/room.entity';

@Entity()
export class VcInteraction extends BaseAlkemioEntity implements IVcInteraction {
  @ManyToOne(() => Room, room => room.vcInteractions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  room!: Room;

  @Column('varchar', { length: 128, nullable: false })
  threadID!: string;

  @Column('char', { length: 36, nullable: false })
  virtualContributorID!: string;
}
