import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity } from 'typeorm';
import { ILicense } from './license.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';

@Entity()
export class License extends AuthorizableEntity implements ILicense {
  @Column('varchar', {
    length: 36,
    nullable: true,
    default: SpaceVisibility.ACTIVE,
  })
  visibility!: SpaceVisibility;
}
