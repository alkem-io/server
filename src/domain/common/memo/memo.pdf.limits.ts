// Measured renderer bounds for synchronous layout and source decoding. Shared
// by the render core (in the worker) and the image resolver (in the server
// process), so it must stay free of runtime imports.
export const MAX_IMAGES = 20;
export const MAX_SOURCE_IMAGE_PIXELS = 16_777_216;
