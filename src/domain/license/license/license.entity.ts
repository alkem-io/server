import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity } from 'typeorm';
import { ILicense } from './license.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';

@Entity()
export class License extends AuthorizableEntity implements ILicense {
  @Column('varchar', {
    length: 255,
    nullable: false,
    default: SpaceVisibility.ACTIVE,
  })
  visibility!: SpaceVisibility;

  @Column('text')
  featureFlags!: string;
}
