import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Entity, Column, ManyToOne } from 'typeorm';
import { License } from '../license/license.entity';
import { ILicenseFeatureFlag } from './feature.flag.interface';

@Entity()
export class FeatureFlag
  extends BaseAlkemioEntity
  implements ILicenseFeatureFlag
{
  @Column('text', { nullable: false })
  name!: string;

  @Column('boolean', { nullable: false })
  enabled!: boolean;

  @ManyToOne(() => License, license => license.featureFlags)
  license!: License;
}
