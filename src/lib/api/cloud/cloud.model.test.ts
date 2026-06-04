import { describe, expect, it } from 'vitest';

import {
  SHARE_TOKEN_ALPHABET,
  SHARE_TOKEN_BYTE_LENGTH,
  encodeShareToken,
  generateShareToken
} from './cloud.model';

describe('encodeShareToken', () => {
  it('maps each byte through the share token alphabet', () => {
    const bytes = new Uint8Array([0, 1, 2, 3]);

    expect(encodeShareToken(bytes)).toBe('1234');
  });

  it('produces one character per input byte', () => {
    const bytes = new Uint8Array(SHARE_TOKEN_BYTE_LENGTH);

    expect(encodeShareToken(bytes)).toHaveLength(SHARE_TOKEN_BYTE_LENGTH);
  });

  it('uses only characters from SHARE_TOKEN_ALPHABET', () => {
    const bytes = new Uint8Array([3, 17, 42, 99, 200, 11, 55, 88]);

    for (const char of encodeShareToken(bytes)) {
      expect(SHARE_TOKEN_ALPHABET).toContain(char);
    }
  });
});

describe('generateShareToken', () => {
  it('returns a token with the expected byte length', () => {
    expect(generateShareToken()).toHaveLength(SHARE_TOKEN_BYTE_LENGTH);
  });

  it('returns alphabet-only characters', () => {
    for (const char of generateShareToken()) {
      expect(SHARE_TOKEN_ALPHABET).toContain(char);
    }
  });
});
