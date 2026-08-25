// Past roughly this size, loading the source into ffmpeg's virtual filesystem
// starts to hit the memory ceiling of a browser tab. It is a warning, not a
// block — plenty of machines cope, and the exported script always works.
export const LARGE_SOURCE_BYTES = 1.2 * 1024 * 1024 * 1024
export const LARGE_SOURCE_LABEL = '1.2 GB'
