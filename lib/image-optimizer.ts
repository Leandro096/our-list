/**
 * Server-only image optimization helpers for payment proof uploads.
 *
 * Uses `sharp` to resize and compress images before uploading to
 * Supabase Storage so the bucket stays lean and load times are fast.
 *
 * IMPORTANT: this module must only be imported in Server Actions /
 * Route Handlers — never in client components.
 */

// Limits
const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB raw upload cap
const MAX_OUTPUT_WIDTH = 2000; // px — enough for A4 scans
const JPEG_QUALITY = 80; // %

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_PDF_TYPE = 'application/pdf';

export class ProofValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofValidationError';
  }
}

export type OptimizedProof = {
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
  outputSize: number;
  extension: string;
};

/**
 * Validates a File/Blob and returns an optimized buffer ready for upload.
 *
 * - Images  → resized to max 2000 px wide, re-compressed to JPEG 80 %.
 * - PDFs    → returned as-is (no recompression); size is validated.
 * - Others  → rejected with ProofValidationError.
 */
export async function optimizeProof(file: File): Promise<OptimizedProof> {
  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new ProofValidationError(
      `El archivo supera el límite de ${MAX_PROOF_SIZE_BYTES / 1024 / 1024} MB.`
    );
  }

  const mimeType = file.type.toLowerCase();

  if (mimeType === ALLOWED_PDF_TYPE) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      buffer,
      mimeType: ALLOWED_PDF_TYPE,
      originalSize: file.size,
      outputSize: buffer.length,
      extension: 'pdf',
    };
  }

  if (ALLOWED_IMAGE_TYPES.has(mimeType)) {
    // Dynamic import so sharp is only loaded server-side
    const sharp = (await import('sharp')).default;

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    const outputBuffer = await sharp(inputBuffer)
      .rotate() // honour EXIF orientation
      .resize({ width: MAX_OUTPUT_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return {
      buffer: outputBuffer,
      mimeType: 'image/jpeg',
      originalSize: file.size,
      outputSize: outputBuffer.length,
      extension: 'jpg',
    };
  }

  throw new ProofValidationError(
    `Tipo de archivo no permitido: ${mimeType}. Sube una imagen (JPG/PNG/WebP) o un PDF.`
  );
}
