import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IInnovationFlow } from './innovation.flow.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';

@Entity()
export class InnovationFlow
  extends AuthorizableEntity
  implements IInnovationFlow
{
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  profile!: Profile;

  @Column('text')
  states!: string;
}
