import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IVcInteraction } from './vc.interaction.interface';
import { Room } from '../room/room.entity';
import { MESSAGEID_LENGTH, UUID_LENGTH } from '@common/constants';

@Entity()
export class VcInteraction extends BaseAlkemioEntity implements IVcInteraction {
  @Index('FK_1ba25e7d3dc29fa02b88e17fca0')
  @ManyToOne(() => Room, room => room.vcInteractions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  room!: Room;

  @Column('varchar', { length: MESSAGEID_LENGTH, nullable: false })
  threadID!: string;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  virtualContributorID!: string;
}
