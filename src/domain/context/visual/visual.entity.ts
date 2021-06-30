import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { IVisual } from '@domain/context/visual/visual.interface';

@Entity()
export class Visual extends BaseAlkemioEntity implements IVisual {
  @Column('text')
  avatar = '';

  @Column('text')
  background = '';

  @Column('text')
  banner = '';
}
