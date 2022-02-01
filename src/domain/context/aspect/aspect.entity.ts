import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IAspect } from './aspect.interface';
import { Context } from '@domain/context/context/context.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { IDiscussion } from '@domain/communication/discussion/discussion.interface';
import { Discussion } from '@domain/communication/discussion/discussion.entity';

@Entity()
export class Aspect extends AuthorizableEntity implements IAspect {
  @Column()
  title: string;

  @Column('text', { name: 'framing' })
  description: string;

  @Column('text', { name: 'explanation' })
  explanation: string;

  @Column('varchar', { length: 36, nullable: true })
  createdBy!: string;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  banner?: Visual;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  bannerNarrow?: Visual;

  @OneToOne(() => Discussion, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  discussion?: IDiscussion;

  @ManyToOne(() => Context, context => context.aspects, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

  constructor(title: string, description: string, explanation: string) {
    super();
    this.title = title;
    this.description = description;
    this.explanation = explanation;
  }
}
