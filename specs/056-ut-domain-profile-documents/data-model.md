# Data Model: profile-documents

## Key Interfaces

### IStorageBucket
- `id: string`
- `documents: IDocument[]` -- array of documents in the bucket (must be loaded/initialized)
- `allowedMimeTypes: string[]`
- `maxFileSize: number`
- `authorization?: IAuthorizationPolicy`

### IDocument
- `id: string`
- `createdBy: string`
- `externalID: string`
- `displayName: string`
- `mimeType: string`
- `size: number`
- `temporaryLocation: boolean`
- `storageBucket: IStorageBucket`
- `tagset: ITagset`
- `authorization: IAuthorizationPolicy`

## Service Dependencies

| Dependency | Methods Used |
|---|---|
| `DocumentService` | `isAlkemioDocumentURL`, `getDocumentFromURL`, `getPubliclyAccessibleURL`, `createDocument`, `getDocumentsBaseUrlPath` |
| `StorageBucketService` | `addDocumentToStorageBucketOrFail` |
| `DocumentAuthorizationService` | `applyAuthorizationPolicy` |
