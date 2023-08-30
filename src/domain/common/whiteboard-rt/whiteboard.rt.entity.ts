import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
} from 'typeorm';
import { compressText, decompressText } from '@common/utils/compression.util';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';

@Entity()
export class WhiteboardRt extends NameableEntity implements IWhiteboardRt {
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
}
