import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IVirtualPersona } from './virtual.persona.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { VirtualPersonaEngine } from '@common/enums/virtual.persona.engine';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';

@Entity()
export class VirtualPersona extends NameableEntity implements IVirtualPersona {
  @Column('text', { nullable: false })
  engine!: VirtualPersonaEngine;

  @Column('text', { nullable: false })
  prompt!: string;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;
}
