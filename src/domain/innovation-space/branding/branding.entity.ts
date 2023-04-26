import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Visual } from '@domain/common/visual';

@Entity()
export class Branding extends BaseAlkemioEntity {
  @OneToOne(() => Visual)
  @JoinColumn()
  logo!: Visual;

  @Column('text', {
    nullable: true,
  })
  styles?: string;
}
