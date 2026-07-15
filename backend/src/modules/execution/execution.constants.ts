// Shared between the DTOs, controller and service for the chunked media-upload flow (docs/
// architecture/05's "Chunked, resumable media" strategy).
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const CHUNK_SIZE_BYTES = 512 * 1024;
