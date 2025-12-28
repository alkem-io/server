import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { ICredential } from './credential.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';

@Entity()
export class Credential extends BaseAlkemioEntity implements ICredential {
  @Column('varchar', { length: UUID_LENGTH, nullable: false })
  resourceID!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: string;

  @ManyToOne(() => Actor, actor => actor.credentials, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'actorId' })
  actor?: Actor;

  @Column('uuid', { nullable: true })
  actorId?: string;

  @Column('uuid', { nullable: true })
  issuer!: string;

  @Column({ type: 'timestamp', nullable: true })
  expires?: Date;

  constructor() {
    super();
  }
}
