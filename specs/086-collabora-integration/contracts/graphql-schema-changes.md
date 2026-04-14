# GraphQL Schema Changes: Collabora Document Integration

**Branch**: `086-collabora-integration` | **Date**: 2026-04-14

## New Enum Value

```graphql
# Add to existing CalloutContributionType enum
enum CalloutContributionType {
  POST
  WHITEBOARD
  LINK
  MEMO
  COLLABORA_DOCUMENT  # NEW
}
```

## New Enum

```graphql
enum CollaboraDocumentType {
  SPREADSHEET
  PRESENTATION
  TEXT_DOCUMENT
}
```

## New Types

```graphql
type CollaboraDocument {
  id: UUID!
  profile: Profile!
  documentType: CollaboraDocumentType!
  createdDate: DateTime!
  updatedDate: DateTime!
  authorization: Authorization
}

type CollaboraEditorUrl {
  """The full Collabora editor URL with embedded WOPI token for iframe loading."""
  editorUrl: String!
  """Token time-to-live in milliseconds."""
  accessTokenTTL: Float!
}
```

## New Input Types

```graphql
input CreateCollaboraDocumentInput {
  """Title for the new document."""
  displayName: String!
  """Type of document to create."""
  documentType: CollaboraDocumentType!
}

input UpdateCollaboraDocumentInput {
  ID: UUID!
  """New title for the document."""
  displayName: String
}
```

## Extended Input

```graphql
# Extend existing CreateContributionOnCalloutInput
input CreateContributionOnCalloutInput {
  calloutID: UUID!
  type: CalloutContributionType!
  post: CreatePostInput
  whiteboard: CreateWhiteboardInput
  link: CreateLinkInput
  memo: CreateMemoInput
  collaboraDocument: CreateCollaboraDocumentInput  # NEW
}
```

## Extended Type

```graphql
# Extend existing CalloutContribution
type CalloutContribution {
  # ... existing fields ...
  collaboraDocument: CollaboraDocument  # NEW (nullable, populated when type is COLLABORA_DOCUMENT)
}
```

## New Query

```graphql
extend type Query {
  """
  Get a Collabora editor URL for a collaborative document.
  Requests a WOPI access token and constructs the editor iframe URL.
  Requires READ privilege on the document.
  """
  collaboraEditorUrl(collaboraDocumentID: UUID!): CollaboraEditorUrl!
}
```

## New Input Type (Delete)

```graphql
input DeleteCollaboraDocumentInput {
  """The ID of the CollaboraDocument to delete."""
  ID: UUID!
}
```

## New Mutations

```graphql
extend type Mutation {
  """Update a Collabora document (rename)."""
  updateCollaboraDocument(updateData: UpdateCollaboraDocumentInput!): CollaboraDocument!

  """Delete a Collabora document and its underlying file."""
  deleteCollaboraDocument(deleteData: DeleteCollaboraDocumentInput!): CollaboraDocument!
}
```

## No Breaking Changes

- 1 new enum value on `CalloutContributionType` (additive)
- 1 new enum `CollaboraDocumentType`
- 1 new type `CollaboraDocument`
- 1 new type `CollaboraEditorUrl`
- 1 new optional field on `CalloutContribution`
- 1 new optional field on `CreateContributionOnCalloutInput`
- 1 new query
- 2 new mutations (update + delete)
