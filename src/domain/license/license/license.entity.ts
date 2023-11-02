import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ILicense } from './license.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { FeatureFlag } from '../feature-flag/feature.flag.entity';

@Entity()
export class License extends AuthorizableEntity implements ILicense {
  @Column('varchar', {
    length: 36,
    nullable: false,
    default: SpaceVisibility.ACTIVE,
  })
  visibility!: SpaceVisibility;

  @OneToMany(() => FeatureFlag, featureFlag => featureFlag.license, {
    eager: false,
    cascade: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  featureFlags?: FeatureFlag[];
}
