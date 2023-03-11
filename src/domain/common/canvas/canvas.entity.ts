import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { ICanvas } from './canvas.interface';
import { CanvasCheckout } from '../canvas-checkout/canvas.checkout.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { compressText, decompressText } from '@common/utils/compression.util';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { Profile } from '../profile';

@Entity()
export class Canvas extends NameableEntity implements ICanvas {
  constructor(name?: string, value?: string) {
    super();
    this.value = value || '';
  }

  @BeforeInsert()
  @BeforeUpdate()
  async compressValue() {
    if (this.value !== '') {
      this.value = await compressText(this.value);
    }
  }
  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressValue() {
    if (this.value !== '') {
      this.value = await decompressText(this.value);
    }
  }

  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @Column('longtext', { nullable: false })
  value!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Callout, callout => callout.canvases, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @OneToOne(() => CanvasCheckout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  checkout?: CanvasCheckout;
}
