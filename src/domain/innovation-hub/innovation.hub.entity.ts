import { Column, Entity } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { SUBDOMAIN_LENGTH } from '@common/constants';
import { InnovationHubType } from './innovation.hub.type.enum';

@Entity()
export class InnovationHub extends NameableEntity implements IInnovationHub {
  @Column({
    unique: true,
  })
  nameID!: string;

  @Column('varchar', {
    length: SUBDOMAIN_LENGTH,
    unique: true,
  })
  subdomain!: string;

  @Column()
  type!: InnovationHubType;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  hubVisibilityFilter?: SpaceVisibility;

  @Column('simple-array', {
    nullable: true,
  })
  hubListFilter?: string[];
}
