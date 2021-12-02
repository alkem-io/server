import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';

@Entity()
export class CanvasCheckout
  extends AuthorizableEntity
  implements ICanvasCheckout
{
  @Column()
  canvasCheckoutID!: string;

  @Column({ default: CanvasCheckoutStateEnum.AVAILABLE })
  status!: string;

  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;
}
