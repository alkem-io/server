import { Column, Entity } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { HubVisibility } from '@common/enums/hub.visibility';
import { IInnovationHxb } from '@domain/innovation-hub/innovation.hub.interface';
import { SUBDOMAIN_LENGTH } from '@common/constants';
import { InnovationHxbType } from './innovation.hub.type.enum';

@Entity()
export class InnovationHxb extends NameableEntity implements IInnovationHxb {
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
  type!: InnovationHxbType;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  hubVisibilityFilter?: HubVisibility;

  @Column('simple-array', {
    nullable: true,
  })
  hubListFilter?: string[];
}
