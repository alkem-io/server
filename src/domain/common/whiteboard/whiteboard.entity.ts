import { ENUM_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { compressText, decompressText } from '@common/utils/compression.util';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToOne,
} from 'typeorm';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IWhiteboard } from './whiteboard.interface';
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
    // Guard against partial selects (e.g. the unified metadata index-only
    // reads/writes) where `content` is not loaded: only (de)compress a
    // non-empty string, never `undefined`/`null`.
    if (typeof this.content === 'string' && this.content !== '') {
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
    if (typeof this.content === 'string' && this.content !== '') {
      try {
        this.content = await decompressText(this.content);
      } catch (e: any) {
        this.content = '';
        // rethrow to be caught higher, does not crash the server
        throw new Error(`Failed to decompress content: ${e?.message}`);
      }
    }
  }

  @Column('text', { nullable: false })
  content!: string;

  /**
   * Locator into the collaboration BlobStore that holds the encoded snapshot.
   * For `blobStore = 'inline'` this is the whiteboard id (the snapshot stays in
   * `content`); for an offloaded blob it is the file-service UUID / S3 key /
   * local path. Part of the unified metadata/index (FR-001).
   */
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  contentPointer?: string;

  /**
   * Which BlobStore backend holds the snapshot located by `contentPointer`.
   * `inline` (default) keeps the blob in `content`; non-inline values mean the
   * collaboration-service owns the blob and the server stores only the index
   * (FR-001, FR-003).
   */
  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  blobStore?: BlobStoreKind;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @Column('jsonb', { nullable: false })
  previewSettings!: IWhiteboardPreviewSettings;

  /**
   * Non-persisted field used by GraphQL resolver to surface the computed guest access flag.
   * Default `false` so consumers always receive a defined boolean.
   */
  guestContributionsAllowed = false;

  @OneToOne(
    () => CalloutFraming,
    framing => framing.whiteboard,
    {
      nullable: true,
    }
  )
  framing?: CalloutFraming;

  @OneToOne(
    () => CalloutContribution,
    contribution => contribution.whiteboard,
    { nullable: true }
  )
  contribution?: CalloutContribution;
}
