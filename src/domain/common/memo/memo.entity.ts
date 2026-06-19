import { ENUM_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IMemo } from './memo.interface';

@Entity()
export class Memo extends NameableEntity implements IMemo {
  @Column('bytea', { nullable: true })
  content?: Buffer;

  /**
   * Locator into the collaboration BlobStore that holds the encoded snapshot.
   * For `blobStore = 'inline'` this is the memo id (the snapshot stays in
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

  /**
   * The collaboration content version owned by the collaboration-service room
   * (the contract `version`). The room bumps it per persisted snapshot, sends
   * it on `collaboration-save`, and adopts the stored value back on
   * `collaboration-fetch` when it rehydrates (FR-004, data-model.md §metadata).
   *
   * Distinct from the inherited TypeORM `@VersionColumn` (`version`), which is a
   * server-internal optimistic-locking counter and MUST NOT be conflated with
   * this contract value.
   */
  @Column('int', { nullable: true })
  contentVersion?: number;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @OneToOne(
    () => CalloutFraming,
    framing => framing.memo,
    {
      nullable: true,
    }
  )
  framing?: CalloutFraming;

  @OneToOne(
    () => CalloutContribution,
    contribution => contribution.memo,
    {
      nullable: true,
    }
  )
  contribution?: CalloutContribution;
}
