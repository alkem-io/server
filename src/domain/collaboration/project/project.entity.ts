import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Agreement } from '@domain/collaboration/agreement/agreement.entity';
import { IProject } from './project.interface';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

@Entity()
export class Project extends NameableEntity implements IProject {
  @Column()
  spaceID!: string;

  @OneToOne(() => Lifecycle, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @OneToMany(() => Agreement, agreement => agreement.project, {
    eager: true,
    cascade: true,
  })
  agreements?: Agreement[];

  @ManyToOne(() => Opportunity, opportunity => opportunity.projects, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  opportunity?: Opportunity;
}
