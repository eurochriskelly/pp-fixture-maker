import { Tournament } from '@/lib/types';

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_STORED_METHOD = 0;

const ARCHIVE_ENTRY_NAME = 'tournament.json';
const ARCHIVE_FORMAT = 'ppp-tournament-v1';

export interface PppArchivePayload {
  format: typeof ARCHIVE_FORMAT;
  exportedAt: string;
  tournament: Tournament;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const readUint32 = (view: DataView, offset: number) => view.getUint32(offset, true);
const readUint16 = (view: DataView, offset: number) => view.getUint16(offset, true);

export const createPppArchive = (tournament: Tournament): Blob => {
  const payload: PppArchivePayload = {
    format: ARCHIVE_FORMAT,
    exportedAt: new Date().toISOString(),
    tournament
  };

  const encoder = new TextEncoder();
  const fileNameBytes = encoder.encode(ARCHIVE_ENTRY_NAME);
  const fileDataBytes = encoder.encode(JSON.stringify(payload, null, 2));
  const fileCrc = crc32(fileDataBytes);

  const localHeaderSize = 30;
  const centralHeaderSize = 46;
  const endHeaderSize = 22;

  const localOffset = 0;
  const localRecordLength = localHeaderSize + fileNameBytes.length + fileDataBytes.length;
  const centralOffset = localRecordLength;
  const centralRecordLength = centralHeaderSize + fileNameBytes.length;
  const endOffset = centralOffset + centralRecordLength;

  const totalSize = endOffset + endHeaderSize;
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);

  let cursor = 0;
  view.setUint32(cursor, ZIP_LOCAL_FILE_HEADER_SIGNATURE, true); cursor += 4;
  view.setUint16(cursor, 20, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, ZIP_STORED_METHOD, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint32(cursor, fileCrc, true); cursor += 4;
  view.setUint32(cursor, fileDataBytes.length, true); cursor += 4;
  view.setUint32(cursor, fileDataBytes.length, true); cursor += 4;
  view.setUint16(cursor, fileNameBytes.length, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  bytes.set(fileNameBytes, cursor); cursor += fileNameBytes.length;
  bytes.set(fileDataBytes, cursor);

  cursor = centralOffset;
  view.setUint32(cursor, ZIP_CENTRAL_DIRECTORY_SIGNATURE, true); cursor += 4;
  view.setUint16(cursor, 20, true); cursor += 2;
  view.setUint16(cursor, 20, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, ZIP_STORED_METHOD, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint32(cursor, fileCrc, true); cursor += 4;
  view.setUint32(cursor, fileDataBytes.length, true); cursor += 4;
  view.setUint32(cursor, fileDataBytes.length, true); cursor += 4;
  view.setUint16(cursor, fileNameBytes.length, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint32(cursor, 0, true); cursor += 4;
  view.setUint32(cursor, localOffset, true); cursor += 4;
  bytes.set(fileNameBytes, cursor);

  cursor = endOffset;
  view.setUint32(cursor, ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, true); cursor += 4;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 0, true); cursor += 2;
  view.setUint16(cursor, 1, true); cursor += 2;
  view.setUint16(cursor, 1, true); cursor += 2;
  view.setUint32(cursor, centralRecordLength, true); cursor += 4;
  view.setUint32(cursor, centralOffset, true); cursor += 4;
  view.setUint16(cursor, 0, true);

  return new Blob([bytes], { type: 'application/zip' });
};

const findEndOfCentralDirectoryOffset = (bytes: Uint8Array): number => {
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i;
    }
  }
  return -1;
};

export const parsePppArchive = async (file: File): Promise<PppArchivePayload> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  const endOffset = findEndOfCentralDirectoryOffset(bytes);
  if (endOffset < 0) {
    throw new Error('Invalid PPP file: ZIP end record not found.');
  }

  if (readUint32(view, endOffset) !== ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
    throw new Error('Invalid PPP file: ZIP end record signature mismatch.');
  }

  const entries = readUint16(view, endOffset + 10);
  const centralOffset = readUint32(view, endOffset + 16);

  if (entries < 1) {
    throw new Error('Invalid PPP file: archive contains no files.');
  }

  if (readUint32(view, centralOffset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
    throw new Error('Invalid PPP file: central directory not found.');
  }

  const compressedSize = readUint32(view, centralOffset + 20);
  const uncompressedSize = readUint32(view, centralOffset + 24);
  const fileNameLength = readUint16(view, centralOffset + 28);
  const extraLength = readUint16(view, centralOffset + 30);
  const commentLength = readUint16(view, centralOffset + 32);
  const localHeaderOffset = readUint32(view, centralOffset + 42);
  const method = readUint16(view, centralOffset + 10);

  if (method !== ZIP_STORED_METHOD) {
    throw new Error('Invalid PPP file: unsupported compression method.');
  }

  const localNameLength = readUint16(view, localHeaderOffset + 26);
  const localExtraLength = readUint16(view, localHeaderOffset + 28);
  const localDataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
  const localDataEnd = localDataOffset + compressedSize;

  if (localDataEnd > bytes.length) {
    throw new Error('Invalid PPP file: truncated archive data.');
  }

  const fileData = bytes.slice(localDataOffset, localDataEnd);
  if (compressedSize !== uncompressedSize) {
    throw new Error('Invalid PPP file: unsupported compressed entry.');
  }

  if (fileNameLength + extraLength + commentLength <= 0) {
    throw new Error('Invalid PPP file: malformed central directory.');
  }

  const decoder = new TextDecoder();
  const rawJson = decoder.decode(fileData);
  const parsed = JSON.parse(rawJson) as Partial<PppArchivePayload>;

  if (parsed.format !== ARCHIVE_FORMAT || !parsed.tournament) {
    throw new Error('Invalid PPP file: unsupported payload format.');
  }

  return {
    format: ARCHIVE_FORMAT,
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    tournament: parsed.tournament as Tournament
  };
};
