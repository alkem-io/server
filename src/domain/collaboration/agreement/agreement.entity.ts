import { Project } from '@domain/collaboration/project/project.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IAgreement } from './agreement.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';

@Entity()
export class Agreement extends BaseAlkemioEntity implements IAgreement {
  @Column()
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(() => Project, project => project.agreements, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  project?: Project;

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset!: Tagset;
}
