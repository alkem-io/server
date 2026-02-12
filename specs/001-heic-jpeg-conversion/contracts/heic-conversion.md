# Contract: HEIC Conversion & Image Compression

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## GraphQL Schema Impact

**Minor additive change**: The `MimeTypeVisual` enum is extended with two new values:
- `HEIC = 'image/heic'`
- `HEIF = 'image/heif'`

This is a **non-breaking additive change** — existing clients continue to work unchanged. The enum extension allows clients to query these MIME types but does not require schema updates.

The existing mutations remain identical:

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
- All compressible images (JPEG, WebP) are automatically optimized
- The response is identical (a Visual with a URI pointing to a JPEG file)
- The served file is always JPEG with `Content-Type: image/jpeg` (for HEIC conversions and compressed images)

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

### ImageCompressionService

New internal service — not exposed via GraphQL. Used by `VisualService` and optionally by `StorageBucketService`. Runs **after** HEIC conversion (if applicable).

```typescript
interface ImageCompressionResult {
  buffer: Buffer;
  mimeType: string;    // 'image/jpeg' after compression
  fileName: string;    // Extension may change (e.g., .png → .jpg)
  compressed: boolean; // True if compression/resize was applied
  originalSize: number;
  finalSize: number;
}

interface IImageCompressionService {
  /**
   * Optimizes compressible images (JPEG, WebP): quality 80–85 MozJPEG, resize if >4096px, auto-orient, strip EXIF.
   * Non-compressible formats (SVG, GIF, PNG) pass through unchanged.
   *
   * @param buffer - Image file buffer (JPEG, PNG, or WebP)
   * @param mimeType - Current MIME type
   * @param fileName - Current filename
   * @returns Compression result with potentially optimized buffer
   * @throws ValidationException if compression fails
   */
  compressIfNeeded(buffer: Buffer, mimeType: string, fileName: string): Promise<ImageCompressionResult>;

  /**
   * Check if compression should be applied to this format.
   * Returns false for SVG, GIF, PNG, and other non-compressible formats.
   */
  isCompressibleFormat(mimeType: string): boolean;
}
```

### Conversion Parameters

| Parameter | Value | Rationale |
| --- | --- | --- |
| JPEG quality | 1.0 (heic-convert scale 0–1, equivalent to ~100%) | `heic-convert` uses a 0–1 quality scale; 1.0 produces highest quality JPEG output. Compression is handled separately by `ImageCompressionService`. |
| Metadata | stripped | `heic-convert` preserves EXIF in JPEG output, but the subsequent processing step (compression or standalone auto-orient) strips all metadata per FR-005. Orientation is applied to pixel data before stripping. |
| Pages extracted | main image only | `convert()` extracts main image; `convert.all()` available but not used per clarification |

### Compression Parameters

| Parameter | Value | Rationale |
| --- | --- | --- |
| Size threshold | N/A — all compressible images optimized | No size threshold; every JPEG/WebP is processed |
| Quality | 82 (range 80–85) | Sweet spot — visually indistinguishable from 100, 3–5x smaller |
| MozJPEG | enabled | 5–10% smaller output at equivalent quality vs standard libjpeg |
| Auto-orient | true | Corrects EXIF orientation to prevent rotated output |
| Metadata | stripped | `sharp.rotate()` auto-orients then all EXIF metadata is discarded per FR-005 (GDPR) |
| Max dimension | 4096px longest side | Resize before compression if longest side exceeds cap; preserves aspect ratio |
| PNG alpha handling | N/A — PNG excluded from compression | PNG passes through unchanged to preserve transparency |
| SVG bypass | yes | Vector format excluded from compression |

### Error Contract

| Condition | Error Type | Message Pattern |
| --- | --- | --- |
| Corrupted HEIC file | `ValidationException` | "Failed to convert HEIC image" |
| HEIC exceeds 15MB | `ValidationException` | "File size exceeds the maximum allowed size of 15MB for HEIC uploads" |
| Unsupported HEIC codec | `ValidationException` | "Unsupported HEIC format variant" |
| Compression failure | `ValidationException` | "Failed to compress image" |
| heic-convert processing failure | `StorageUploadFailedException` | "Upload on visual failed!" (existing pattern) |
| sharp processing failure | `StorageUploadFailedException` | "Upload on visual failed!" (existing pattern) |

Error details (file size, original MIME type, conversion duration) are placed in the exception `details` payload per coding standards — never in the message string.

## MIME Type Changes

### Accepted (input)

| MIME Type | Extension | Status |
| --- | --- | --- |
| `image/heic` | `.heic` | **New — accepted, converted to JPEG, then optimized** |
| `image/heif` | `.heif` | **New — accepted, converted to JPEG, then optimized** |
| `image/jpeg` | `.jpg`, `.jpeg` | Existing — **always optimized** (quality 80–85, max 4096px, EXIF stripped) |
| `image/png` | `.png` | Existing — always pass-through (preserves transparency) |
| `image/webp` | `.webp` | Existing — **always optimized** (re-encoded as JPEG quality 80–85) |
| `image/svg+xml` | `.svg` | Existing — always pass-through (vector format, no compression) |

### Stored (output)

HEIC files are **never** stored in their original format. After conversion:
- MIME type: `image/jpeg`
- Extension: `.jpg`
- Buffer: JPEG-encoded pixel data

All compressible images are stored optimized:
- MIME type: `image/jpeg` (JPEG/WebP are re-encoded)
- Extension: `.jpg`
- Quality: 80–85 MozJPEG
- Max dimension: 4096px longest side

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

### sharp (new dependency)

| Property | Value |
| --- | --- |
| Package | `sharp` |
| Version | `^0.34.5` |
| License | Apache-2.0 |
| Type | Production dependency |
| Native binaries | Prebuilt via `@img/sharp-*` optional dependencies (JPEG/PNG/WebP/AVIF/TIFF/GIF/SVG; **no HEIC**) |
| Docker compatibility | linux-x64 glibc (matches Node 22 Docker base) |
| macOS dev | Prebuilt darwin-arm64 and darwin-x64 available |
| Weekly downloads | ~35M |
| Use in this feature | Image compression & resizing only (not HEIC decoding) |
