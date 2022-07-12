import { Entity, OneToMany } from 'typeorm';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { ICallout } from './callout.interface';

@Entity()
export class Callout extends NameableEntity implements ICallout {
  @OneToMany(() => Canvas, canvas => canvas.callout, {
    eager: false,
    cascade: true,
  })
  canvases?: Canvas[];

  @OneToMany(() => Aspect, aspect => aspect.callout, {
    eager: false,
    cascade: true,
  })
  aspects?: Aspect[];
}
