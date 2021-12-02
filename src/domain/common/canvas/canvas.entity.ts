import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICanvas } from './canvas.interface';
import { Context } from '@domain/context/context/context.entity';
import { CanvasCheckout } from '../canvas-checkout/canvas.checkout.entity';

@Entity()
export class Canvas extends BaseAlkemioEntity implements ICanvas {
  constructor(name?: string, value?: string) {
    super();
    this.name = name || '';
    this.value = value || '';
  }

  @Column('text', { nullable: false })
  name!: string;

  @Column('text', { nullable: false })
  value!: string;

  @ManyToOne(() => Context, context => context.canvases, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

  @OneToOne(() => CanvasCheckout, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  checkout?: CanvasCheckout;
}
