# Quickstart: HEIC Conversion & Image Compression

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## Prerequisites

- Node.js 22.21.1 (Volta-pinned)
- pnpm 10.17.1 (`corepack enable && corepack prepare pnpm@10.17.1 --activate`)
- Running services: PostgreSQL, RabbitMQ, Redis (via `pnpm run start:services`)

## Setup

```bash
# 1. Switch to feature branch
git checkout 001-heic-jpeg-conversion

# 2. Install dependencies (including heic-convert + sharp packages)
pnpm install

# 3. Start backing services
pnpm run start:services

# 4. Run migrations (if any migration was added)
pnpm run migration:run

# 5. Start the server
pnpm start:dev
```

## Verification

### Quick Smoke Test

```bash
# Upload a HEIC image via GraphQL mutation (requires authentication)
# Use GraphQL Playground at http://localhost:3000/graphiql

# 1. Find a visual ID to upload to (e.g., a space avatar)
# 2. Use the uploadImageOnVisual mutation with a .heic file
# 3. Verify the response contains a valid URI
# 4. Fetch the URI and confirm Content-Type is image/jpeg
# 5. Upload any JPEG — verify stored file is optimized (quality 80-85, max 4096px)
# 6. Upload a PNG — verify stored file is unchanged (preserves transparency)
```

### Unit Tests

```bash
# Run conversion service tests
pnpm run test:ci src/domain/common/visual/__tests__/image.conversion.service.spec.ts

# Run compression service tests
pnpm run test:ci src/domain/common/visual/__tests__/image.compression.service.spec.ts
```

### Manual Test with curl

```bash
# Get a sample HEIC file (e.g., from an iPhone or download a test file)
# The server accepts HEIC via the standard uploadImageOnVisual mutation
# After upload, verify via:
curl -s -I "http://localhost:3000/api/private/rest/storage/document/<document-id>" | grep Content-Type
# Expected: Content-Type: image/jpeg
```

## Key Files

| Purpose | Path |
| --- | --- |
| Conversion service | `src/domain/common/visual/image.conversion.service.ts` |
| Compression service | `src/domain/common/visual/image.compression.service.ts` |
| MIME type enum | `src/common/enums/mime.file.type.visual.ts` |
| Visual constraints | `src/domain/common/visual/visual.constraints.ts` |
| Upload entry point | `src/domain/common/visual/visual.service.ts` |
| Conversion tests | `src/domain/common/visual/__tests__/image.conversion.service.spec.ts` |
| Compression tests | `src/domain/common/visual/__tests__/image.compression.service.spec.ts` |

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `sharp` install fails | sharp ships prebuilt binaries for most platforms (linux-x64 glibc, darwin-x64, darwin-arm64). If prebuilt unavailable, verify: Node.js ≥18, platform support at [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/install). In Docker, ensure glibc-based image (not Alpine musl without extra config). |
| HEIC upload rejected with "not in allowed mime types" | Existing Visual entities in DB may have stale `allowedTypes`. Check if the code-level fix in `validateMimeType` is in place, or run the data migration. |
| Converted image appears rotated | Both the compression step and standalone processing use `sharp({ autoOrient: true })` to bake orientation into pixel data before stripping EXIF. If rotation is wrong, check that `autoOrient` is enabled in the sharp pipeline. All EXIF metadata (including orientation tags) is stripped from stored files per FR-005. |
| Out of memory on large HEIC files | The 15MB upload limit should prevent this. Check if `storage.file.max_file_size` in `alkemio.yml` is set correctly. |
| Image not optimized | Check MIME type is compressible (JPEG, WebP — not SVG, GIF, or PNG). Check `ImageCompressionService` logs at verbose level. |
| Compressed image quality too low | The compression uses JPEG quality 82 (80–85 range) with MozJPEG. If quality is unacceptable, adjust `COMPRESSION_QUALITY` in `image.compression.service.ts`. |
