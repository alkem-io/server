import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICanvas } from './canvas.interface';
import { Context } from '@domain/context/context/context.entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { CanvasCheckout } from '../canvas-checkout/canvas.checkout.entity';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';

@Entity()
export class Canvas extends NameableEntity implements ICanvas {
  constructor(name?: string, value?: string) {
    super();
    this.displayName = name || '';
    this.value = value || '';
    this.isTemplate = false;
  }

  @Column('longtext', { nullable: false })
  value!: string;

  @Column('boolean', { nullable: false })
  isTemplate!: boolean;

  @ManyToOne(() => Context, context => context.canvases, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

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
  bannerCard?: Visual;
}
