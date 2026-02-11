# Research: HEIC to JPEG Image Conversion

**Feature**: 001-heic-jpeg-conversion  
**Date**: 2026-02-11

## R1: Image Conversion Library Selection

**Decision**: `sharp` (v0.34.x)

**Rationale**:
- Built on libvips, the fastest image processing library available for Node.js (4-5x faster than ImageMagick)
- Native HEIC/HEIF input support via bundled libvips (no separate codec installation needed)
- Apache-2.0 license — fully compatible with Alkemio's EUPL-1.2 license
- 35M+ weekly downloads; mature, well-maintained (active since 2013)
- Prebuilt platform binaries via `@img/sharp-*` packages — no native compilation required during `pnpm install`
- Supports JPEG output with configurable quality, EXIF metadata preservation, and auto-orientation
- Built-in resize/optimization capabilities for future image size optimization requirements
- Supports buffer-in / buffer-out workflow matching the existing upload pipeline pattern

**Alternatives considered**:
- `heic-convert`: Lightweight HEIC-only converter. Rejected: smaller community (300 weekly downloads), no resize/optimization path for future needs, depends on `libheif` WASM which is slower.
- `jimp`: Pure JavaScript image processor. Rejected: No native HEIC support; would require a separate HEIC decoder. Significantly slower than sharp for large images.
- `imagemagick` / `gm`: CLI-based wrappers. Rejected: Requires system-level installation in Docker; not a Node-native dependency; harder to manage in CI/CD pipeline.
- `heic2any` (browser-only): Rejected: Browser-side library, not suitable for server-side processing in NestJS.

## R2: HEIC MIME Type Detection

**Decision**: Detect HEIC/HEIF by both MIME type and file extension.

**Rationale**:
- iPhones set the MIME type to `image/heic` or `image/heif` when uploading
- Some clients may send generic `application/octet-stream` — in this case, fall back to file extension check (`.heic`, `.heif`)
- The `graphql-upload` middleware passes through the client-provided MIME type
- sharp can detect the actual format from buffer content regardless of declared MIME type

**Alternatives considered**:
- MIME-only detection: Rejected — some upload clients don't set HEIC MIME type correctly.
- Magic-byte detection (file signature): Over-engineered for this use case; sharp handles format detection internally.

## R3: Conversion Pipeline Insertion Point

**Decision**: Insert conversion logic in `VisualService.uploadImageOnVisual()` after stream-to-buffer and before dimension validation. Also handle in `StorageBucketService.uploadFileAsDocument()` for generic file uploads to buckets with image MIME types allowed.

**Rationale**:
- `VisualService.uploadImageOnVisual()` is the single entry point for all visual uploads (avatar, banner, card, gallery image). Injecting conversion here covers all visual types automatically.
- Conversion must happen before `getImageDimensions()` because `image-size` does not support HEIC format — the buffer must be JPEG by the time dimensions are read.
- The converted buffer, updated filename (`.heic` → `.jpg`), and updated MIME type (`image/jpeg`) are passed downstream. The rest of the pipeline (dimension validation, storage bucket upload, document creation) works unchanged.
- For `StorageBucketService`, HEIC files uploaded via `uploadFileOnStorageBucket` also need conversion if the bucket allows image types.

**Alternatives considered**:
- Middleware-level conversion (Express/GraphQL middleware): Rejected — too broad; would process non-image requests. Also violates domain-centric design (Principle 1).
- Conversion at storage adapter layer: Rejected — too late in the pipeline; dimension validation would have already failed.
- Separate async conversion worker (RabbitMQ): Over-engineered; conversion is fast (<5s) and can happen synchronously within the request.

## R4: EXIF Metadata Preservation

**Decision**: Use sharp's `keepMetadata()` (or `withMetadata()`) combined with `autoOrient: true` to preserve EXIF data while correcting orientation.

**Rationale**:
- iPhone HEIC files contain EXIF orientation tags; converting to JPEG without auto-orientation can produce rotated images.
- `sharp(buffer, { autoOrient: true })` reads the EXIF orientation, rotates the pixel data accordingly, and resets the orientation tag to 1 (normal).
- `.keepMetadata()` preserves ICC profile, EXIF (date, camera info), and XMP data in the output JPEG.
- This matches FR-005 (preserve EXIF metadata including orientation, date taken, camera information).

**Alternatives considered**:
- Strip all metadata: Rejected — violates FR-005.
- Preserve metadata without auto-orient: Rejected — would produce rotated images in browsers that don't respect EXIF orientation.

## R5: Multi-Frame HEIC Handling

**Decision**: Use sharp's default behavior which extracts the primary/first page from multi-frame containers.

**Rationale**:
- sharp defaults to `pages: 1, page: 0` which extracts only the first frame/page.
- Live Photos store the primary still frame as the first page; additional frames (video key frames, burst shots) are subsequent pages.
- No special configuration needed — sharp's default behavior matches the clarified requirement.

## R6: `image-size` Compatibility

**Decision**: Keep `image-size` for non-HEIC formats; for HEIC, obtain dimensions from sharp's metadata output after conversion.

**Rationale**:
- `image-size` does not support HEIC format and would throw an error on HEIC buffers.
- After HEIC→JPEG conversion, the buffer is standard JPEG and `image-size` works correctly.
- Since conversion happens before `getImageDimensions()`, no change to the image-size dependency is needed.
- Future optimization: could replace `image-size` entirely with `sharp.metadata()` for all formats, but this is out of scope.

## R7: Docker / Deployment Impact

**Decision**: No Dockerfile changes required.

**Rationale**:
- sharp v0.34+ ships prebuilt binaries for `linux-x64` (glibc) via npm optional dependencies (`@img/sharp-linux-x64`).
- The existing Dockerfile uses a Node 22 base image with glibc — sharp's prebuilt binaries work out of the box.
- No system-level `apt-get install` for libheif/libvips needed; sharp bundles its own libvips.
- Docker image size increase: ~25MB (sharp's prebuilt libvips binary). Acceptable for the functionality gained.
