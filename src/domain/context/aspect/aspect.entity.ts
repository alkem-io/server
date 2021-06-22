import { Column, Entity, ManyToOne } from 'typeorm';
import { IAspect } from './aspect.interface';
import { Context } from '@domain/context/context/context.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

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
    context => context.aspects,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  context?: Context;

  constructor(title: string, framing: string, explanation: string) {
    super();
    this.title = title;
    this.framing = framing;
    this.explanation = explanation;
  }
}
