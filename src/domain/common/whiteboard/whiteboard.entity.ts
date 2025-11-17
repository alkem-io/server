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
import { IWhiteboard } from './whiteboard.interface';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { IWhiteboardPreviewSettings } from './whiteboard.preview.settings.interface';

@Entity()
export class Whiteboard extends NameableEntity implements IWhiteboard {
  constructor(content?: string) {
    super();
    this.content = content || '';
  }

  @BeforeInsert()
  @BeforeUpdate()
  async compressValue() {
    if (this.content !== '') {
      try {
        this.content = await compressText(this.content);
      } catch {
        this.content = '';
        // rethrow to be caught higher, does not crash the server
        throw new Error('Failed to compress content');
      }
    }
  }
  @AfterInsert()
  @AfterUpdate()
  @AfterLoad()
  async decompressValue() {
    if (this.content !== '') {
      try {
        this.content = await decompressText(this.content);
      } catch (e: any) {
        this.content = '';
        // rethrow to be caught higher, does not crash the server
        throw new Error(`Failed to decompress content: ${e?.message}`);
      }
    }
  }

  @Column('longtext', { nullable: false })
  content!: string;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @Column('json', { nullable: false })
  previewSettings!: IWhiteboardPreviewSettings;
}
