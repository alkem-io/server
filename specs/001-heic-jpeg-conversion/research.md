# Research: HEIC Conversion & Image Compression

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## R1: Image Conversion Library Selection

**Decision**: `heic-convert` (v2.1.x) — pure JavaScript HEIC→JPEG/PNG converter

**Rationale**:
- Pure JavaScript/WASM-based (uses `libheif-js` internally) — no native compilation, no system-level dependencies
- ISC license — fully compatible with Alkemio's EUPL-1.2 license
- 314k+ weekly downloads; stable, well-maintained by `catdad-experiments`
- TypeScript declarations available via `@types/heic-convert`
- Tiny package footprint (7.92 kB unpacked) with only 3 dependencies
- Simple buffer-in / buffer-out API matching the existing upload pipeline pattern: `convert({ buffer, format: 'JPEG', quality: 1 })`
- Works out of the box on all platforms — no Dockerfile changes, no prebuilt binaries to manage
- Supports configurable JPEG quality output

**Why not `sharp`?** Sharp's prebuilt binaries **do not include HEIC/HEIF support** due to HEVC patent/licensing constraints. The maintainer confirmed (sharp issue #4479) that HEVC codec licensing fees would be ~US$25M/year at sharp's download volume. Getting HEIC working with sharp requires building from source against a globally-installed `libvips + libheif + libde265` combo, which is complex and fragile in Docker environments (67+ GitHub issues from users struggling with this).

**Future image optimization**: `sharp` is now included in this feature for image compression and resizing of all uploaded images exceeding 3MB. The pipeline is: `heic-convert` (HEIC→JPEG) → `sharp` (compress/resize any JPEG/PNG >3MB). Sharp's prebuilt binaries handle JPEG/PNG/WebP natively; only HEIC decoding is excluded from prebuilts.

**Alternatives considered**:
- `sharp` (v0.34.x): The most capable image processing library for Node.js (libvips-based). However, **prebuilt binaries exclude HEIC** due to HEVC patent risk. Using sharp for HEIC requires building from source with globally-installed libvips+libheif+libde265 — complex Docker setup, fragile CI/CD, and patent exposure. Rejected for HEIC conversion; may be added later for general image optimization on non-HEIC formats.
- `jimp`: Pure JavaScript image processor. Rejected: No native HEIC support; would require a separate HEIC decoder. Significantly slower than heic-convert for large images.
- `imagemagick` / `gm`: CLI-based wrappers. Rejected: Requires system-level installation in Docker; not a Node-native dependency; harder to manage in CI/CD pipeline.
- `heic2any` (browser-only): Rejected: Browser-side library, not suitable for server-side processing in NestJS.

**Performance note**: `heic-convert` performs work partially synchronously (WASM execution). For high-concurrency scenarios, a worker thread may be needed. For current Alkemio workloads this is acceptable — conversion is a per-upload operation, not a high-throughput batch process.

## R2: HEIC MIME Type Detection

**Decision**: Detect HEIC/HEIF by both MIME type and file extension.

**Rationale**:
- iPhones set the MIME type to `image/heic` or `image/heif` when uploading
- Some clients may send generic `application/octet-stream` — in this case, fall back to file extension check (`.heic`, `.heif`)
- The `graphql-upload` middleware passes through the client-provided MIME type
- `heic-convert` works on any valid HEIC buffer regardless of declared MIME type

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
- Separate async conversion worker (RabbitMQ): Over-engineered; conversion is fast and can happen within the request.

## R4: EXIF Metadata Preservation

**Decision**: Use `heic-convert`'s JPEG output combined with sharp for auto-orientation. `heic-convert` preserves embedded EXIF metadata in its JPEG output by default. However, per our GDPR-first decision, the compression step (or a standalone sharp call for images not needing compression) applies `autoOrient: true` to bake orientation into pixel data and then strips all EXIF metadata — no GPS, date, camera info, or other personal data is retained in the stored file.

**Simplified approach**: The compression pipeline uses `sharp({ autoOrient: true })` to normalize orientation into pixel data, then outputs JPEG without metadata. For images ≤3MB that skip compression, a separate `sharp(buffer).rotate().toBuffer()` call handles auto-orientation and metadata stripping. This ensures no EXIF data (GPS, personal info) is ever persisted.

**Rationale**:
- iPhone HEIC files contain EXIF orientation tags; these are preserved in the converted JPEG output by `heic-convert`.
- Modern browsers and image viewers respect EXIF orientation automatically.
- If server-side auto-orientation becomes needed in the future, `sharp` can be added to post-process the JPEG buffer (which is a standard format sharp supports out of the box).
- This matches FR-005 (strip all EXIF metadata; apply orientation to pixel data via auto-orient).

**Alternatives considered**:
- Strip all metadata: Rejected — violates FR-005.
- Add sharp just for auto-orientation: Over-engineered for now — adds a large dependency for a single operation that browsers handle natively. Can be added later if needed.

## R5: Multi-Frame HEIC Handling

**Decision**: Use `heic-convert`'s default `convert()` function which extracts the primary/main image from the container.

**Rationale**:
- `heic-convert`'s `convert()` function extracts only the main image from a HEIC container by default.
- For multi-image containers, the `convert.all()` API is available but not needed — per clarification, only the primary still image should be extracted.
- Live Photos store the primary still frame as the main image; additional frames are accessible via `convert.all()` but intentionally skipped.
- No special configuration needed — `heic-convert`'s default behavior matches the clarified requirement.

## R6: `image-size` Compatibility

**Decision**: Keep `image-size` for all formats; for HEIC, obtain dimensions from the converted JPEG buffer.

**Rationale**:
- `image-size` does not support HEIC format and would throw an error on HEIC buffers.
- After HEIC→JPEG conversion via `heic-convert`, the buffer is standard JPEG and `image-size` works correctly.
- Since conversion happens before `getImageDimensions()`, no change to the image-size dependency is needed.
- Future optimization: could replace `image-size` with a more capable library, but this is out of scope.

## R7: Docker / Deployment Impact

**Decision**: No Dockerfile changes required.

**Rationale**:
- `heic-convert` is a pure JavaScript/WASM package with no native dependencies — runs on any platform where Node.js runs.
- No system-level packages (`apt-get install ...`) needed in the Docker image for HEIC conversion.
- `sharp` ships prebuilt binaries for `linux-x64` (glibc) via `@img/sharp-linux-x64` optional dependency. The existing Dockerfile uses a Node 22 base image with glibc — works out of the box.
- Combined Docker image size increase: ~28 MB (sharp's prebuilt libvips ~25 MB + libheif-js WASM ~3 MB). Acceptable for the functionality gained.
- No prebuilt binary platform compatibility concerns for HEIC (handled by pure JS). Sharp's prebuilt binaries are available for all target platforms (linux-x64, darwin-arm64, darwin-x64).
- CI/CD pipeline unchanged — `pnpm install` handles everything.

## R8: Image Compression Library for Large Files

**Decision**: `sharp` (v0.34.x) for JPEG/PNG compression and resizing of images exceeding 3MB.

**Rationale**:
- Built on libvips, the fastest image processing library for Node.js (4–5x faster than ImageMagick)
- Apache-2.0 license — fully compatible with Alkemio's EUPL-1.2 license
- 35M+ weekly downloads; mature, well-maintained (active since 2013)
- Prebuilt platform binaries for JPEG/PNG/WebP/AVIF/TIFF/GIF/SVG — no native compilation required
- Supports JPEG quality adjustment, progressive JPEG, MozJPEG optimization, and proportional resizing
- Buffer-in / buffer-out workflow matches the existing upload pipeline
- `sharp(buffer).jpeg({ quality, mozjpeg: true }).toBuffer()` for quality reduction
- `sharp(buffer).resize({ width, height, fit: 'inside', withoutEnlargement: true }).jpeg({ quality }).toBuffer()` for resizing
- Auto-orientation via `{ autoOrient: true }` corrects EXIF rotation
- `.rotate()` applies EXIF orientation to pixel data (auto-orient), then metadata is discarded

**HEIC exclusion reminder**: Sharp's prebuilt binaries do NOT decode HEIC. HEIC decoding is handled by `heic-convert` upstream. By the time sharp processes an image, HEIC has already been converted to JPEG.

## R9: Compression Strategy for Images >3MB

**Decision**: Resize to max 4096px longest side, then compress at JPEG quality 80–85.

**Algorithm**:
1. If image buffer ≤3MB and longest side ≤4096px — pass through unchanged.
2. If longest side >4096px — resize to 4096px on longest side (preserve aspect ratio, `fit: 'inside'`, `withoutEnlargement: true`).
3. Compress with JPEG quality 82 (midpoint of 80–85 range) + MozJPEG + autoOrient + strip EXIF → check size.
4. If still >3MB — store result (best-effort). Do not reject the upload.

**Rationale**:
- Quality 80–85 is the sweet spot — visually indistinguishable from 100 for most photographic images, roughly 3–5x smaller.
- MozJPEG produces 5–10% smaller files at equivalent quality vs standard libjpeg.
- 4096px max dimension covers retina/high-DPI displays while eliminating extremely large raw sensor outputs (48MP iPhone Pro = ~8064×6048).
- Resize-first approach reduces pixel count before compression, making quality reduction more effective.
- `fit: 'inside'` with `withoutEnlargement: true` ensures images are only shrunk, never upscaled.
- Best-effort: if after resize + quality 82 the image is still >3MB, store the compressed version. Don't reject the upload.

**Alternatives considered**:
- Progressive quality stepping (85→75→65): Rejected — adds complexity and multiple sharp passes. A single quality in the 80–85 range produces excellent results for nearly all images.
- WebP conversion instead of JPEG: Considered but rejected for now — JPEG has universal compatibility. WebP can be added as a future enhancement.
- Server-side only resize with no quality reduction: Rejected — resizing alone isn’t enough for dense high-quality images.

## R10: Compression Scope — Which Formats Are Compressed

**Decision**: Compress JPEG and PNG images exceeding 3MB. PNG is converted to JPEG during compression (alpha composited against white). SVG, GIF, and WebP (≤3MB) pass through unchanged.

**Rationale**:
- JPEG: Direct quality reduction and resize via sharp.
- PNG: Often very large (lossless). Converting to JPEG during compression is acceptable — most uploaded PNGs are photos, not graphics requiring transparency. Alpha channel is composited against white via `sharp(buffer).flatten({ background: '#ffffff' }).jpeg(...)` .
- SVG: Vector format — compression/resizing is not applicable.
- GIF: Typically small; animating frames make compression complex. Out of scope.
- WebP: Already compressed. If >3MB, can be re-encoded via sharp, but rare. Included if straightforward.
- Auto-orientation is applied during compression via `sharp(buffer, { autoOrient: true })` — this also resolves the EXIF orientation concern for HEIC-converted images.
