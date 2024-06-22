import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Library } from '@library/library/library.entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IPlatform } from './platform.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Licensing } from '@platform/licensing/licensing.entity';
import { VirtualPersona } from '@platform/virtual-persona/virtual.persona.entity';

@Entity()
export class Platform extends AuthorizableEntity implements IPlatform {
  @OneToOne(() => Communication, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  communication?: Communication;

  @OneToOne(() => Library, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  library?: Library;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator!: StorageAggregator;

  @OneToOne(() => Licensing, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  licensing?: Licensing;

  @OneToMany(() => VirtualPersona, persona => persona.platform, {
    eager: false,
    cascade: true,
  })
  virtualPersonas!: VirtualPersona[];
}
