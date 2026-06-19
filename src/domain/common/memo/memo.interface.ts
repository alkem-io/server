import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';

@ObjectType('Memo')
export abstract class IMemo extends INameable {
  content?: Buffer;

  // Internal metadata/index columns (FR-001) — not exposed on the GraphQL API.
  contentPointer?: string;

  blobStore?: BlobStoreKind;

  // Collaboration content version owned by the collab room (contract `version`,
  // FR-004) — distinct from the inherited TypeORM `@VersionColumn`. Internal.
  contentVersion?: number;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Memo content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  createdBy?: string;

  callout?: ICallout;
}
