# Data Model: src/domain/storage

## Entity Relationships

```
StorageAggregator (1) ---> (1) StorageBucket [directStorage]
StorageAggregator (1) ---> (*) StorageAggregator [parentStorageAggregator]
StorageAggregator (1) ---> (*) StorageBucket [via storageAggregator FK]
StorageBucket (1) ---> (*) Document [documents]
Document (1) ---> (1) Tagset [tagset]
Document (1) ---> (1) AuthorizationPolicy [authorization]
StorageBucket (1) ---> (1) AuthorizationPolicy [authorization]
StorageAggregator (1) ---> (1) AuthorizationPolicy [authorization]
```

## Key Entities
- **StorageAggregator**: Top-level grouping (types: SPACE, PLATFORM, ORGANIZATION, USER, ACCOUNT), has directStorage bucket and optional parent aggregator
- **StorageBucket**: Contains documents, has allowedMimeTypes and maxFileSize constraints
- **Document**: File metadata (displayName, mimeType, size, externalID), links to tagset and authorization

## Authorization Model
- Authorization policies cascade: parent -> StorageAggregator -> StorageBucket -> Document
- Documents get extra credential rules for their creator (USER_SELF_MANAGEMENT)
- StorageBuckets get privilege rules: FILE_UPLOAD from UPDATE, FILE_UPLOAD from CONTRIBUTE, FILE_DELETE from DELETE
- StorageAggregators get anonymous/registered READ access
