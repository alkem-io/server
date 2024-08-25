import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ISpaceDefaults } from './space.defaults.interface';
import { Template } from '@domain/template/template/template.entity';

@Entity()
export class SpaceDefaults
  extends AuthorizableEntity
  implements ISpaceDefaults
{
  @OneToOne(() => Template, {
    eager: true,
    cascade: false, // important not to cascade
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  innovationFlowTemplate?: Template;
}
