import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IVirtualPersona } from './virtual.persona.interface';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';
import { Platform } from '@platform/platfrom/platform.entity';
import { VirtualPersonaAccessMode } from '@common/enums/virtual.persona.access.mode';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class VirtualPersona
  extends AuthorizableEntity
  implements IVirtualPersona
{
  @ManyToOne(() => Platform, platform => platform.virtualPersonas, {
    eager: true,
  })
  @JoinColumn()
  platform!: Platform;

  @Column({ length: 128, nullable: false })
  engine!: VirtualContributorEngine;

  @Column({
    length: 64,
    nullable: false,
    default: VirtualPersonaAccessMode.SPACE_PROFILE,
  })
  dataAccessMode!: VirtualPersonaAccessMode;
}
