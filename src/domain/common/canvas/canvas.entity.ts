import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICanvas } from './canvas.interface';
import { Context } from '@domain/context/context/context.entity';
import { CanvasCheckout } from '../canvas-checkout/canvas.checkout.entity';
import { AuthorizableEntity } from '../entity/authorizable-entity';

@Entity()
export class Canvas extends AuthorizableEntity implements ICanvas {
  constructor(name?: string, value?: string) {
    super();
    this.name = name || '';
    this.value = value || '';
    this.isTemplate = false;
  }

  @Column('text', { nullable: false })
  name!: string;

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
}
