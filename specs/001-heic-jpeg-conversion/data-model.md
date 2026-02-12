# Data Model: HEIC Conversion & Image Compression

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## Overview

This feature does **not** introduce new database entities or schema changes. The conversion and compression are runtime transformations in the upload pipeline — buffers are processed in-memory before being stored. Existing entities (`Visual`, `Document`, `StorageBucket`) are used unchanged.

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

### Image Optimization Constants (new)

**File**: `src/domain/common/visual/image.compression.service.ts` (or a shared constants file)

```
COMPRESSION_QUALITY = 82                        // sweet spot in 80-85 range
MAX_DIMENSION = 4096                            // longest side cap
NON_COMPRESSIBLE_MIMES = ['image/svg+xml', 'image/gif', 'image/png', 'image/x-png']
```

Used by the optimization service to determine how to process images. All compressible images (JPEG, WebP) are optimized regardless of size.

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
| mimeType | MimeFileType | Will be `image/jpeg` for converted/compressed files |
| externalID | string | SHA hash of file contents (content-addressed) |
| size | number | Size of the final processed file (converted and/or compressed) |
| createdBy | string | User ID |
| temporaryLocation | boolean | Upload staging flag |

No schema changes needed — HEIC files are stored as JPEG with a JPEG MIME type. Large images are stored at their compressed size.

### StorageBucket

No changes. The bucket's `allowedMimeTypes` already include image types. Since HEIC is converted to JPEG and large images are compressed before storage, the stored document's MIME type will always be an already-allowed type.

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
    │  ├─ HEIC detected → convert({ buffer, format: 'JPEG', quality: 1 }) via heic-convert
    │  │                   → return { buffer: jpegBuffer, mimeType: 'image/jpeg', fileName: 'photo.jpg' }
    │  └─ Not HEIC → return unchanged { buffer, mimeType, fileName }
    │
    ▼
ImageCompressionService.compressIfNeeded(buffer, mimeType, fileName)
    │  ├─ SVG/GIF/PNG → skip (pass through unchanged, preserve transparency for PNG)
    │  └─ JPEG/WebP → optimize via sharp:
    │       Step 1: Resize to 4096px max longest side (if larger, preserve aspect ratio)
    │       Step 2: JPEG quality 82 + MozJPEG + autoOrient (strip EXIF per FR-005)
    │
    ▼
Get Image Dimensions (image-size works on JPEG buffer)
    │
    ▼
Validate Width/Height constraints
    │
    ▼
StorageBucketService.uploadFileAsDocumentFromBuffer(bucketId, processedBuffer, 'photo.jpg', 'image/jpeg', userId)
    │
    ▼
Document created with final processed metadata (JPEG MIME, compressed size)
```

## Migration Requirements

**Database migration**: Not strictly required for HEIC conversion to work. However, a migration MAY be needed to update `allowedTypes` on existing `Visual` entities so they accept HEIC uploads. Two approaches:

1. **Code-level fix (preferred)**: Modify `validateMimeType()` to check HEIC against the current `DEFAULT_VISUAL_CONSTRAINTS` constant rather than (or in addition to) the stored `allowedTypes`. This avoids a data migration.
2. **Data migration**: Update all `Visual` rows to add `image/heic,image/heif` to their `allowedTypes` column. Requires a TypeORM migration.

Decision: Approach 1 (code-level) is simpler and aligns with Constitution Principle 10 (simplicity).
