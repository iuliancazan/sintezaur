import type { StorageFileType } from '@sintezaur/shared';

/**
 * Magic-byte detector for the M7 upload pipeline.
 *
 * The browser-supplied `Content-Type` is advisory only — clients lie
 * (deliberately or via misconfigured uploaders). We sniff the first
 * 16 bytes against known signatures before accepting a file.
 *
 * Eight formats supported, matching the four pipelines:
 *   image: JPEG, PNG, WebP
 *   audio: MP3 (with/without ID3 tag), WAV, OGG
 *   pdf:   PDF
 *   zip:   ZIP
 *
 * No external dep — keeps onboarding simple and dodges the file-type
 * package's ESM-only migration past v18.
 */

export interface DetectedFile {
  fileType: StorageFileType;
  mimeType: string;
  extension: string;
}

interface Signature {
  fileType: StorageFileType;
  mimeType: string;
  extension: string;
  /** Bytes to compare. `null` means "any byte at that offset". */
  bytes: (number | null)[];
  /** Byte offset within the buffer at which `bytes` starts. */
  offset?: number;
}

const SIGNATURES: Signature[] = [
  // -------- images --------
  {
    fileType: 'image',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    bytes: [0xff, 0xd8, 0xff],
  },
  {
    fileType: 'image',
    mimeType: 'image/png',
    extension: 'png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    // WebP: 'RIFF' + (size 4 bytes) + 'WEBP'. We ignore size with nulls.
    fileType: 'image',
    mimeType: 'image/webp',
    extension: 'webp',
    bytes: [
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      null, null, null, null, // length
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
    ],
  },
  // -------- audio --------
  {
    // MP3 with ID3v2 header ('ID3').
    fileType: 'audio',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    bytes: [0x49, 0x44, 0x33],
  },
  {
    // MP3 frame sync without ID3. First byte 0xFF, second has 0xFB/0xFA/0xF3/0xF2.
    fileType: 'audio',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    bytes: [0xff, 0xfb],
  },
  {
    fileType: 'audio',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    bytes: [0xff, 0xfa],
  },
  {
    fileType: 'audio',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    bytes: [0xff, 0xf3],
  },
  {
    fileType: 'audio',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    bytes: [0xff, 0xf2],
  },
  {
    // WAV: 'RIFF' + size + 'WAVE'.
    fileType: 'audio',
    mimeType: 'audio/wav',
    extension: 'wav',
    bytes: [
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      null, null, null, null, // length
      0x57, 0x41, 0x56, 0x45, // 'WAVE'
    ],
  },
  {
    // OGG: 'OggS'.
    fileType: 'audio',
    mimeType: 'audio/ogg',
    extension: 'ogg',
    bytes: [0x4f, 0x67, 0x67, 0x53],
  },
  // -------- documents --------
  {
    // PDF: '%PDF-'.
    fileType: 'pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    bytes: [0x25, 0x50, 0x44, 0x46, 0x2d],
  },
  {
    // ZIP: 'PK\x03\x04' (local file header) or 'PK\x05\x06' (empty zip).
    fileType: 'zip',
    mimeType: 'application/zip',
    extension: 'zip',
    bytes: [0x50, 0x4b, 0x03, 0x04],
  },
  {
    fileType: 'zip',
    mimeType: 'application/zip',
    extension: 'zip',
    bytes: [0x50, 0x4b, 0x05, 0x06],
  },
];

export function detectFileType(buffer: Buffer): DetectedFile | null {
  for (const sig of SIGNATURES) {
    if (matches(buffer, sig)) {
      return {
        fileType: sig.fileType,
        mimeType: sig.mimeType,
        extension: sig.extension,
      };
    }
  }
  return null;
}

function matches(buffer: Buffer, sig: Signature): boolean {
  const off = sig.offset ?? 0;
  if (buffer.length < off + sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i++) {
    const expected = sig.bytes[i];
    if (expected === null) continue;
    if (buffer[off + i] !== expected) return false;
  }
  return true;
}
