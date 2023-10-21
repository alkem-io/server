import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity } from 'typeorm';
import { ILicense } from './license.interface';

@Entity()
export class License extends AuthorizableEntity implements ILicense {
  @Column('text')
  featureFlags!: string;
}
