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
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardCheckout } from '../whiteboard-checkout/whiteboard.checkout.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { compressText, decompressText } from '@common/utils/compression.util';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';

@Entity()
export class Whiteboard extends NameableEntity implements IWhiteboard {
  constructor(value?: string) {
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

  @Column('longtext', { nullable: false })
  value!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Callout, callout => callout.whiteboards, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @OneToOne(() => WhiteboardCheckout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  checkout?: WhiteboardCheckout;
}
