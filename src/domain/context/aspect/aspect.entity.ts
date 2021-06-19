import { Column, Entity, ManyToOne } from 'typeorm';
import { IAspect } from './aspect.interface';
import { Project } from '@domain/collaboration/project/project.entity';
import { Context } from '@domain/context/context/context.entity';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';

@Entity()
export class Aspect extends AuthorizableEntity implements IAspect {
  @Column()
  title: string;

  @Column('text')
  framing: string;

  @Column('text')
  explanation: string;

  @ManyToOne(
    () => Context,
    context => context.aspects
  )
  context?: Context;

  @ManyToOne(
    () => Project,
    project => project.aspects
  )
  project?: Project;

  constructor(title: string, framing: string, explanation: string) {
    super();
    this.title = title;
    this.framing = framing;
    this.explanation = explanation;
  }
}
