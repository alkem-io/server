import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { IInnovationFlow } from './innovation.flow.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';

@Entity()
export class InnovationFlow
  extends AuthorizableEntity
  implements IInnovationFlow
{
  @Index('FK_da7368698d32f610a5fc1880c7f')
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  profile!: Profile;

  @Column('simple-array', { nullable: false })
  states!: string;
}
