import { Column, Entity } from 'typeorm';
import { BaseCherrytwistEntity } from '@domain/common';
import { IVisual } from '@domain/context/visual';

@Entity()
export class Visual extends BaseCherrytwistEntity implements IVisual {
  @Column('text')
  avatar = '';

  @Column('text')
  background = '';

  @Column('text')
  banner = '';
}
