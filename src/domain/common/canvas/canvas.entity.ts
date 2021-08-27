import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ICanvas } from './canvas.interface';

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
}
