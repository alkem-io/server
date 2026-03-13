# Data Model: src/services/file-integration

## Input/Output DTOs

### FileInfoInputData
- `docId: string` - Document identifier
- `auth: { cookie?: string; authorization?: string; guestName?: string }` - Auth headers
- Extends `BaseInputData` (event = 'file-info-input')

### FileInfoOutputData
- `data: { read: boolean } & (ErroredData | SuccessData)` - Result payload
- Extends `BaseOutputData` (event = 'file-info-output')
- ErroredData: `{ errorCode?: ReadOutputErrorCode; error?: string }`
- SuccessData: `{ fileName?: string; mimeType?: string }`

### HealthCheckOutputData
- `healthy: boolean`
- Extends `BaseOutputData` (event = 'health-check-output')

## Enums

### ReadOutputErrorCode
- `USER_NOT_IDENTIFIED`
- `NO_AUTH_PROVIDED`
- `DOCUMENT_NOT_FOUND`
- `FILE_NOT_FOUND`
- `NO_READ_ACCESS`

### FileMessagePatternEnum
- `FILE_INFO = 'file-info'`
- `HEALTH_CHECK = 'health-check'`

## No database entities in this area - it consumes IDocument from the storage domain.
