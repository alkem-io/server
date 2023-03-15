import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Agreement } from '@domain/collaboration/agreement/agreement.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { IProject } from './project.interface';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

@Entity()
export class Project extends NameableEntity implements IProject {
  @Column()
  hubID!: string;

  @Column('text', { nullable: true })
  description?: string;

  @OneToOne(() => Lifecycle, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset?: Tagset;

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

  constructor() {
    super();
  }
}
