import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IVcInteraction } from './vc.interaction.interface';
import { Room } from '../room/room.entity';
import { MESSAGEID_LENGTH } from '@common/constants';

export type ExternalMetadata = {
  threadId?: string;
};

@Entity()
export class VcInteraction extends BaseAlkemioEntity implements IVcInteraction {
  @ManyToOne(() => Room, room => room.vcInteractions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  room!: Room;

  @Column('varchar', { length: MESSAGEID_LENGTH, nullable: false })
  threadID!: string;

  @Column('uuid', { nullable: false })
  virtualContributorID!: string;

  @Column('simple-json')
  externalMetadata: ExternalMetadata = {};
}
