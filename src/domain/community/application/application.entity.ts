import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IQuestion } from '@domain/community/application/application.dto.create';
import { Community } from '@domain/community/community/community.entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IApplication } from './application.interface';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { User } from '@domain/community/user/user.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
@Entity()
export class Application extends AuthorizableEntity implements IApplication {
  @Column()
  ecoverseID?: string;

  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @ManyToMany(
    () => NVP,
    nvp => nvp.id,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'application_questions' })
  questions?: IQuestion[];

  @ManyToOne(
    () => User,
    user => user.applications,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  user!: User;

  @ManyToOne(
    () => Community,
    community => community.applications,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  community?: Community;
}
