import { ENUM_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IWhiteboard } from './whiteboard.interface';
import { IWhiteboardPreviewSettings } from './whiteboard.preview.settings.interface';

@Entity()
export class Whiteboard extends NameableEntity implements IWhiteboard {
  // The inline `content` column (Excalidraw JSON, gzip-compressed) and its
  // `@BeforeInsert/@BeforeUpdate/@AfterLoad` (de)compression hooks are DROPPED
  // (006-collab-content-unification, R2/FR-005): whiteboard content is stored ONLY
  // as a Yjs-V2 snapshot in the document's own storage bucket, located by
  // `contentPointer`. The scene is converted server-side at create via the
  // binding-compatible `whiteboardSceneToYjsV2State` and written to the bucket.

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
