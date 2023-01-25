import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class CanvasCheckout
  extends AuthorizableEntity
  implements ICanvasCheckout
{
  @Column('char', { length: 36, nullable: false })
  canvasID!: string;

  // ID of the user that has the checkout
  @Column('char', { length: 36, nullable: false })
  lockedBy!: string;

  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: false, // NOTE: this is non-standard: to deal with the lifecycle state machine updates while also updating the canvasCheckout entity
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  constructor() {
    super();
    this.canvasID = '';
    this.lockedBy = '';
  }
}
