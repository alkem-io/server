export const COLLABORA_DOCUMENT_OPENED = 'collabora.document.opened';
export const COLLABORA_DOCUMENT_REPLACED = 'collabora.document.replaced';
export const COLLABORA_DOCUMENT_UPLOADED = 'collabora.document.uploaded';

export type CollaboraDocumentActorAttribution = Readonly<{
  actorID: string;
  isAnonymous: boolean;
  guestName: string | undefined;
}>;

export class CollaboraDocumentOpened {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly actorAttribution: CollaboraDocumentActorAttribution
  ) {
    Object.freeze(this);
  }
}

export class CollaboraDocumentReplaced {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly actorAttribution: CollaboraDocumentActorAttribution
  ) {
    Object.freeze(this);
  }
}

export class CollaboraDocumentUploaded {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly actorAttribution: CollaboraDocumentActorAttribution
  ) {
    Object.freeze(this);
  }
}

export type CollaboraDocumentAnalyticsEvent =
  | CollaboraDocumentOpened
  | CollaboraDocumentReplaced
  | CollaboraDocumentUploaded;
