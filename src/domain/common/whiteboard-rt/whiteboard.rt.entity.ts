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
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@Entity()
export class WhiteboardRt extends NameableEntity implements IWhiteboardRt {
  constructor(content?: string) {
    super();
    this.content = content || '';
  }

  @BeforeInsert()
  @BeforeUpdate()
  async compressValue() {
    if (this.content !== '') {
      this.content = await compressText(this.content);
    }
  }
  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressValue() {
    if (this.content !== '') {
      this.content = await decompressText(this.content);
    }
  }

  @Column('longtext', { nullable: false })
  content!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @Column('varchar', {
    length: 255,
    nullable: false,
    default: ContentUpdatePolicy.OWNER_ADMINS,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;
}
