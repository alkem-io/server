import { Column, Entity } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ISpaceDefaults } from './space.defaults.interface';

@Entity()
export class SpaceDefaults
  extends AuthorizableEntity
  implements ISpaceDefaults
{
  @Column('text')
  innovationFlowStates!: string;
}
