import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { compressText, decompressText } from '@common/utils/compression.util';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { User } from '@domain/community/user/user.entity';

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

  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @Column('varchar', {
    length: 255,
    nullable: false,
    default: ContentUpdatePolicy.ADMINS,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;
}
