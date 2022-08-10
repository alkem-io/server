import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICanvas } from './canvas.interface';
import { Visual } from '@domain/common/visual/visual.entity';
import { CanvasCheckout } from '../canvas-checkout/canvas.checkout.entity';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';

@Entity()
export class Canvas extends NameableEntity implements ICanvas {
  constructor(name?: string, value?: string) {
    super();
    this.displayName = name || '';
    this.value = value || '';
  }

  @Column('longtext', { nullable: false })
  value!: string;

  @ManyToOne(() => Callout, callout => callout.canvases, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @OneToOne(() => CanvasCheckout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  checkout?: CanvasCheckout;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preview?: Visual;
}
