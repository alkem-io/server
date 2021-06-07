import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { IQuestion } from '@domain/community/application';
import { Community } from '@domain/community/community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IApplication } from './application.interface';
import { NVP } from '@domain/common/nvp';
import { User } from '@domain/community/user';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';
@Entity()
export class Application extends AuthorizableEntity implements IApplication {
  @Column()
  ecoverseID?: string;

  @OneToOne(() => Lifecycle, { eager: true, cascade: true })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @ManyToOne(
    () => User,
    user => user.applications,
    { eager: true, cascade: true }
  )
  user!: User;

  @ManyToMany(
    () => NVP,
    nvp => nvp.id,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'application_questions' })
  questions?: IQuestion[];

  @ManyToOne(
    () => Community,
    community => community.applications,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  community?: Community;
}
