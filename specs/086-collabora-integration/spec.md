# Feature Specification: Collabora Document Integration

**Feature Branch**: `086-collabora-integration`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "Integrate Collabora Online and WOPI service into the Alkemio platform. Each space can have a set of Collabora documents. Clients can create, edit, and delete collaborative documents through the GraphQL API."

## Clarifications

### Session 2026-04-14

- Q: Where should collaborative documents be attached in the space hierarchy? → A: Inside a Callout — each Collabora document is a contribution within a callout of a new type (e.g., `COLLABORA_DOCUMENT`). This reuses the existing callout/contribution infrastructure.
- Q: Where do empty template files for new documents come from? → A: Ship minimal static template files (empty XLSX/PPTX/DOCX, ~5KB each) with the server. Uploaded to file-service-go when creating a new collaborative document.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Collaborative Document in a Space (Priority: P1)

A space member creates a new collaborative document (spreadsheet, presentation, or text document) within a space. The system creates the document file via the Go file-service-go, registers it in the space's document collection, and returns a URL that the client can use to open the Collabora editor.

**Why this priority**: Without document creation, no other Collabora functionality works. This is the entry point for the entire feature.

**Independent Test**: Call the GraphQL mutation to create a collaborative document in a space. Verify the document record exists, the file is stored, and the returned editor URL loads the Collabora editor.

**Acceptance Scenarios**:

1. **Given** a space with an active collaboration, **When** a member creates a new document with a title and type (spreadsheet/presentation/text), **Then** the system creates an empty document file of the specified type, stores it via the file-service-go, and returns the document ID and editor URL.
2. **Given** a space, **When** a member creates a collaborative document, **Then** the document appears in the space's list of collaborative documents.
3. **Given** a user without write access to the space, **When** they attempt to create a document, **Then** the system denies the request with an authorization error.

---

### User Story 2 - Open and Edit a Collaborative Document (Priority: P1)

A space member opens an existing collaborative document for editing. The system requests a WOPI access token from the WOPI service, constructs the Collabora editor URL with the token, and returns it to the client. The client loads the Collabora iframe with this URL. Multiple users can edit simultaneously.

**Why this priority**: Editing is the core value proposition of Collabora integration. Without it, documents are just static files.

**Independent Test**: Request an editor URL for an existing document. Verify the WOPI token is issued, the Collabora editor loads, and changes are saved back to the file-service-go.

**Acceptance Scenarios**:

1. **Given** an existing collaborative document in a space, **When** a member requests to edit it, **Then** the system obtains a WOPI access token from the WOPI service and returns a Collabora editor URL containing the token.
2. **Given** two members opening the same document simultaneously, **When** both make edits, **Then** Collabora handles real-time collaboration and both see each other's changes.
3. **Given** a user with read-only access to the space, **When** they request to open a document, **Then** they receive a view-only editor URL (no editing capabilities).
4. **Given** an expired or invalid WOPI token, **When** the client tries to use it, **Then** the Collabora editor shows an appropriate error and the client can request a new token.

---

### User Story 3 - Delete a Collaborative Document (Priority: P2)

A space member with appropriate permissions deletes a collaborative document from the space. The system removes the document record and the underlying file.

**Why this priority**: Document lifecycle management requires deletion. Less critical than creation and editing but necessary for space hygiene.

**Independent Test**: Delete a collaborative document via GraphQL. Verify the document is removed from the space's list and the file is deleted from storage.

**Acceptance Scenarios**:

1. **Given** a collaborative document in a space, **When** a member with delete permission removes it, **Then** the document record is deleted, the file is removed via file-service-go, and it no longer appears in the space's document list.
2. **Given** a document currently being edited by another user, **When** the owner deletes it, **Then** the document is marked for deletion and active editing sessions are terminated gracefully.
3. **Given** a user without delete permission, **When** they attempt to delete a document, **Then** the system denies the request.

---

### User Story 4 - List Collaborative Documents in a Space (Priority: P1)

A space member views the list of all collaborative documents available in a space, including document titles, types, creation dates, and last-modified information.

**Why this priority**: Users need to discover and browse documents before they can open them. Essential for navigation.

**Independent Test**: Query the GraphQL API for a space's collaborative documents. Verify the list includes all documents with correct metadata.

**Acceptance Scenarios**:

1. **Given** a space with multiple collaborative documents, **When** a member queries the document list, **Then** they see all documents with title, type, creator, creation date, and last modified date.
2. **Given** a space with no collaborative documents, **When** a member queries the list, **Then** an empty list is returned.
3. **Given** a user without read access to the space, **When** they query the document list, **Then** the system denies the request.

---

### User Story 5 - Rename a Collaborative Document (Priority: P3)

A space member renames an existing collaborative document.

**Why this priority**: Nice-to-have for document management. Lower priority than CRUD and editing.

**Independent Test**: Rename a document via GraphQL. Verify the new name is reflected in the document list.

**Acceptance Scenarios**:

1. **Given** a collaborative document, **When** a member with write access renames it, **Then** the document's title is updated and the change is visible in the document list.

---

### Edge Cases

- What happens when the WOPI service is unavailable? The system returns an error when requesting an editor URL but existing document metadata remains accessible.
- What happens when the Collabora server is down? The editor URL is still generated but the client-side iframe fails to load. The system is not responsible for Collabora availability.
- What happens when a document is created with an unsupported type? The system returns a validation error listing supported document types.
- What happens when multiple users try to delete the same document simultaneously? The first deletion succeeds; subsequent attempts return "not found".
- What happens when storage quota is exceeded? The file-service-go returns an error during document creation, and the server propagates it to the user.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a GraphQL mutation to create a collaborative document in a space, specifying title and document type (spreadsheet, presentation, text document).
- **FR-002**: The system MUST create the initial empty document file (in the appropriate format for the type) via the Go file-service-go and associate it with the space.
- **FR-003**: The system MUST provide a GraphQL query to obtain a Collabora editor URL for a given document. This involves requesting a WOPI access token from the WOPI service, which returns a ready-to-use editor URL.
- **FR-004**: The system MUST provide a GraphQL mutation to delete a collaborative document, removing both the document record and the underlying file.
- **FR-005**: The system MUST provide a GraphQL query to list all collaborative documents in a space with metadata (title, type, creator, dates).
- **FR-006**: The system MUST enforce space-level authorization for all document operations (create, read, edit, delete).
- **FR-007**: The system MUST provide a GraphQL mutation to rename a collaborative document.
- **FR-008**: The WOPI access token request MUST go through the WOPI service's authenticated endpoint (`POST /wopi/token`), which validates the user's identity via Oathkeeper JWT.
- **FR-009**: The system MUST support three document types: spreadsheet (XLSX), presentation (PPTX), and text document (DOCX).
- **FR-010**: When the WOPI service or file-service-go is unavailable, operations that depend on them MUST fail with appropriate errors without leaving partial state.

### Key Entities

- **Callout (COLLABORA_DOCUMENT type)**: A new callout type that serves as a container for collaborative documents within a space's CalloutsSet. Each callout of this type holds contributions that are individual Collabora documents.
- **CalloutContribution (Collabora)**: A contribution within a COLLABORA_DOCUMENT callout. Represents a single collaborative document with a title, document type (spreadsheet/presentation/text), and a reference to the underlying file managed by the Go file-service-go.
- **WOPI Access Token**: A short-lived opaque token issued by the WOPI service that grants Collabora access to read/write a specific document. Not stored by the server -- requested on demand.
- **Editor URL**: A URL constructed from the Collabora discovery endpoint, the document's WOPI file ID, and the access token. Returned to the client for iframe embedding.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create collaborative documents in any space and open them in the Collabora editor within a single user interaction (create + edit URL returned in one flow).
- **SC-002**: Multiple users can simultaneously edit the same document with real-time collaboration (handled by Collabora, not the server).
- **SC-003**: All document operations (create, list, edit, delete, rename) are protected by space-level authorization -- unauthorized users cannot access or modify documents.
- **SC-004**: Document creation, listing, and deletion work correctly when the WOPI service is available, and fail gracefully with descriptive errors when it is not.
- **SC-005**: The Collabora editor loads and saves changes correctly through the WOPI protocol, with the file-service-go handling file persistence.

## Assumptions

- The WOPI service is deployed and accessible at `http://wopi-service:8080` within the cluster. It handles WOPI protocol operations (CheckFileInfo, GetFile, PutFile, Lock) autonomously.
- The Go file-service-go manages the underlying document files. The server creates the initial empty document file via `POST /internal/document` and the WOPI service reads/writes content via its file-service integration.
- Collabora Online is deployed and accessible. The server does not manage Collabora's availability -- it only constructs editor URLs.
- The WOPI service's `POST /wopi/token` endpoint is behind Oathkeeper and uses `alkemio_actor_id` from the JWT to identify the user requesting access.
- Document types map to MIME types: spreadsheet (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet), presentation (application/vnd.openxmlformats-officedocument.presentationml.presentation), text (application/vnd.openxmlformats-officedocument.wordprocessingml.document).
- The server calls the WOPI service via HTTP to obtain tokens. This is a synchronous request -- no AMQP/NATS messaging needed.
- Authorization follows existing space-level patterns. Members with write access can create/edit/rename documents. Members with delete access can delete. Members with read access can view/list.
