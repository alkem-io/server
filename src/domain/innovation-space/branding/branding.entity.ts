import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';

@Entity()
export class Branding extends BaseAlkemioEntity {
  @Column('text', {
    nullable: true,
  })
  styles?: string;
}
