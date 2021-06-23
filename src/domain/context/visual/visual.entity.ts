import { Column, Entity } from 'typeorm';
import { BaseCherrytwistEntity } from '@domain/common/entity/base-entity/base.cherrytwist.entity';
import { IVisual } from '@domain/context/visual/visual.interface';

@Entity()
export class Visual extends BaseCherrytwistEntity implements IVisual {
  @Column('text')
  avatar = '';

  @Column('text')
  background = '';

  @Column('text')
  banner = '';
}
