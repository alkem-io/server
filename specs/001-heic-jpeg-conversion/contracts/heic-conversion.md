# Contract: HEIC Image Conversion

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## GraphQL Schema Impact

**No GraphQL schema changes.** The existing mutations remain identical:

```graphql
# Unchanged — accepts same Upload scalar, returns same Visual type
mutation uploadImageOnVisual($uploadData: UploadImageOnVisualInput!) {
  uploadImageOnVisual(uploadData: $uploadData) {
    id
    uri
    name
  }
}
```

The behavioral change is transparent to API consumers:
- Clients that previously could **not** upload HEIC can now do so
- The response is identical (a Visual with a URI pointing to a JPEG file)
- The served file is always JPEG with `Content-Type: image/jpeg`

## Internal Service Contract

### ImageConversionService

New internal service — not exposed via GraphQL. Used by `VisualService` and optionally by `StorageBucketService`.

```typescript
interface ImageConversionResult {
  buffer: Buffer;
  mimeType: string;    // Always 'image/jpeg' for converted files
  fileName: string;    // Extension changed to .jpg
  converted: boolean;  // True if conversion occurred
}

interface IImageConversionService {
  /**
   * Converts HEIC/HEIF images to JPEG. Non-HEIC images pass through unchanged.
   *
   * @param buffer - Raw image file buffer
   * @param mimeType - Declared MIME type from upload
   * @param fileName - Original filename
   * @returns Conversion result with potentially transformed buffer, MIME type, and filename
   * @throws ValidationException if HEIC conversion fails (corrupted file, unsupported codec)
   */
  convertIfNeeded(buffer: Buffer, mimeType: string, fileName: string): Promise<ImageConversionResult>;

  /**
   * Check if a given MIME type or filename indicates HEIC/HEIF format.
   */
  isHeicFormat(mimeType: string, fileName: string): boolean;
}
```

### Conversion Parameters

| Parameter | Value | Rationale |
| --- | --- | --- |
| JPEG quality | 1.0 (heic-convert scale 0–1, equivalent to ~100%) | `heic-convert` uses a 0–1 quality scale; 1.0 produces highest quality JPEG output. Can be tuned down later if file sizes are too large. |
| Metadata | preserved | `heic-convert` preserves EXIF metadata (orientation, date, camera info) in the JPEG output by default per FR-005 |
| Pages extracted | main image only | `convert()` extracts main image; `convert.all()` available but not used per clarification |

### Error Contract

| Condition | Error Type | Message Pattern |
| --- | --- | --- |
| Corrupted HEIC file | `ValidationException` | "Failed to convert HEIC image" |
| HEIC exceeds 25MB | `ValidationException` | "File size exceeds the maximum allowed size of 25MB for HEIC uploads" |
| Unsupported HEIC codec | `ValidationException` | "Unsupported HEIC format variant" |
| heic-convert processing failure | `StorageUploadFailedException` | "Upload on visual failed!" (existing pattern) |

Error details (file size, original MIME type, conversion duration) are placed in the exception `details` payload per coding standards — never in the message string.

## MIME Type Changes

### Accepted (input)

| MIME Type | Extension | Status |
| --- | --- | --- |
| `image/heic` | `.heic` | **New — accepted, converted to JPEG** |
| `image/heif` | `.heif` | **New — accepted, converted to JPEG** |
| `image/jpeg` | `.jpg`, `.jpeg` | Existing — pass-through |
| `image/png` | `.png` | Existing — pass-through |
| `image/webp` | `.webp` | Existing — pass-through |
| `image/svg+xml` | `.svg` | Existing — pass-through |

### Stored (output)

HEIC files are **never** stored in their original format. After conversion:
- MIME type: `image/jpeg`
- Extension: `.jpg`
- Buffer: JPEG-encoded pixel data

## Dependency Contract

### heic-convert (new dependency)

| Property | Value |
| --- | --- |
| Package | `heic-convert` |
| Version | `^2.1.0` |
| License | ISC |
| Type | Production dependency |
| Native binaries | None — pure JavaScript/WASM |
| Docker compatibility | All platforms (no native deps) |
| macOS dev | Works on all architectures |
| TypeScript types | `@types/heic-convert` (separate dev dependency) |
| Weekly downloads | ~314k |
| Unpacked size | 7.92 kB (core); ~3 MB including libheif-js WASM dependency |
