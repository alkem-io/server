import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { IWhiteboardPreviewSettings } from './whiteboard.preview.settings.interface';

@ObjectType('Whiteboard')
export abstract class IWhiteboard extends INameable {
  // The GraphQL `content` field (Excalidraw JSON String) is REMOVED
  // (006-collab-content-unification — breaking, coupled to client-web at cutover):
  // whiteboard content is no longer a server-held JSON string. It lives ONLY as a
  // Yjs-V2 snapshot in the document's own storage bucket and is read/written via
  // the unified collaboration session (the client's editor Y.Doc), not the API.

  // Internal metadata/index columns (FR-001) — not exposed on the GraphQL API.
  contentPointer?: string;

  blobStore?: BlobStoreKind;

  // Collaboration content version owned by the collab room (contract `version`,
  // FR-004) — distinct from the inherited TypeORM `@VersionColumn`. Internal.
  contentVersion?: number;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Whiteboard content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @Field(() => IWhiteboardPreviewSettings, {
    description: 'The preview settings for the Whiteboard.',
    nullable: false,
  })
  previewSettings!: IWhiteboardPreviewSettings;

  /**
   * Computed value exposed via `guestContributionsAllowed` resolver; retained on the interface for
   * local hydrations and service methods that override it before returning to the API layer.
   * Always treated as a defined boolean at runtime, so there is no GraphQL decorator here.
   */
  guestContributionsAllowed!: boolean;

  createdBy?: string;

  callout?: ICallout;
}
