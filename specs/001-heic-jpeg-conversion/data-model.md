# Data Model: HEIC to JPEG Image Conversion

**Feature**: 001-heic-jpeg-conversion  
**Date**: 2026-02-11

## Overview

This feature does **not** introduce new database entities or schema changes. The conversion is a runtime transformation in the upload pipeline — HEIC buffers are converted to JPEG in-memory before being stored. Existing entities (`Visual`, `Document`, `StorageBucket`) are used unchanged.

The only data-level changes are to in-code enums and constraints that control allowed MIME types.

## Affected Enums & Constants

### MimeTypeVisual (enum)

**File**: `src/common/enums/mime.file.type.visual.ts`

| Member | Value | Status |
| --- | --- | --- |
| BMP | `image/bmp` | Existing |
| JPG | `image/jpg` | Existing |
| JPEG | `image/jpeg` | Existing |
| XPNG | `image/x-png` | Existing |
| PNG | `image/png` | Existing |
| GIF | `image/gif` | Existing |
| WEBP | `image/webp` | Existing |
| SVG | `image/svg+xml` | Existing |
| AVIF | `image/avif` | Existing |
| **HEIC** | **`image/heic`** | **New** |
| **HEIF** | **`image/heif`** | **New** |

### VISUAL_ALLOWED_TYPES (constant array)

**File**: `src/domain/common/visual/visual.constraints.ts`

Add `'image/heic'` and `'image/heif'` to the allowed types array. These are accepted at the validation gate but converted to JPEG before storage.

### HEIC_MIME_TYPES (new constant)

**File**: `src/domain/common/visual/image.conversion.service.ts` (or a shared constants file)

```
HEIC_MIME_TYPES = ['image/heic', 'image/heif']
HEIC_FILE_EXTENSIONS = ['.heic', '.heif']
```

Used by the conversion service to detect whether a buffer needs conversion.

## Existing Entities (unchanged)

### Visual

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| name | VisualType | Discriminator (AVATAR, BANNER, CARD, etc.) |
| uri | string | Public URL to the stored document |
| allowedTypes | string[] (simple-array) | MIME types accepted for this visual — updated via constraints, not DB migration |
| minWidth / maxWidth | number | Dimension constraints |
| minHeight / maxHeight | number | Dimension constraints |
| aspectRatio | number | Width/height ratio |
| alternativeText | string | Alt text |

**Note**: `allowedTypes` is populated at entity creation time from `DEFAULT_VISUAL_CONSTRAINTS`. Existing visuals in the database will NOT automatically accept HEIC — they retain their original `allowedTypes` array. New visuals created after deployment will include HEIC. To update existing visuals, a data migration updating the `allowedTypes` column is needed, OR the validation logic can be adjusted to check against the current `DEFAULT_VISUAL_CONSTRAINTS` rather than the stored value.

### Document

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| displayName | string | Filename — will be `.jpg` after conversion |
| mimeType | MimeFileType | Will be `image/jpeg` for converted files |
| externalID | string | SHA hash of file contents (content-addressed) |
| size | number | Size of the converted JPEG (not the original HEIC) |
| createdBy | string | User ID |
| temporaryLocation | boolean | Upload staging flag |

No schema changes needed — HEIC files are stored as JPEG with a JPEG MIME type.

### StorageBucket

No changes. The bucket's `allowedMimeTypes` already include image types. Since HEIC is converted to JPEG before storage, the stored document's MIME type will always be an already-allowed type.

## Data Flow

```
Upload Request (HEIC)
    │
    ▼
Validate MIME type against visual.allowedTypes (now includes image/heic, image/heif)
    │
    ▼
Stream to Buffer
    │
    ▼
ImageConversionService.convertIfNeeded(buffer, mimeType, fileName)
    │  ├─ HEIC detected → sharp(buffer).jpeg({ quality: 90 }).toBuffer()
    │  │                   → return { buffer: jpegBuffer, mimeType: 'image/jpeg', fileName: 'photo.jpg' }
    │  └─ Not HEIC → return unchanged { buffer, mimeType, fileName }
    │
    ▼
Get Image Dimensions (image-size works on JPEG buffer)
    │
    ▼
Validate Width/Height constraints
    │
    ▼
StorageBucketService.uploadFileAsDocumentFromBuffer(bucketId, jpegBuffer, 'photo.jpg', 'image/jpeg', userId)
    │
    ▼
Document created with JPEG metadata
```

## Migration Requirements

**Database migration**: Not strictly required for HEIC conversion to work. However, a migration MAY be needed to update `allowedTypes` on existing `Visual` entities so they accept HEIC uploads. Two approaches:

1. **Code-level fix (preferred)**: Modify `validateMimeType()` to check HEIC against the current `DEFAULT_VISUAL_CONSTRAINTS` constant rather than (or in addition to) the stored `allowedTypes`. This avoids a data migration.
2. **Data migration**: Update all `Visual` rows to add `image/heic,image/heif` to their `allowedTypes` column. Requires a TypeORM migration.

Decision: Approach 1 (code-level) is simpler and aligns with Constitution Principle 10 (simplicity).
