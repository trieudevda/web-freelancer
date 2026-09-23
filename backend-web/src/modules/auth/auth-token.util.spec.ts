import {
  createSessionToken,
  hashTokenSecret,
  parseSessionToken,
  tokenHashMatches,
} from './auth-token.util.js';

describe('auth-token.util', () => {
  const sessionId = '8c7f56c7-93b7-4a18-8e18-fb023c120024';

  describe('createSessionToken', () => {
    it('should create a parseable token for the supplied session id', () => {
      const created = createSessionToken(sessionId);

      expect(parseSessionToken(created.token)?.sessionId).toBe(sessionId);
      expect(created.hash).toHaveLength(64);
    });

    it('should create a new secret and hash for every call', () => {
      const first = createSessionToken(sessionId);
      const second = createSessionToken(sessionId);

      expect(first.token).not.toBe(second.token);
      expect(first.hash).not.toBe(second.hash);
    });

    it('should hash the secret instead of storing it in plain text', () => {
      const created = createSessionToken(sessionId);
      const parsed = parseSessionToken(created.token);

      expect(parsed).not.toBeNull();
      expect(created.hash).not.toContain(parsed?.secret ?? '');
      expect(tokenHashMatches(parsed?.secret ?? '', created.hash)).toBe(true);
    });
  });

  describe('parseSessionToken', () => {
    it.each([
      '',
      'missing-separator',
      '.missing-session',
      `${sessionId}.`,
      `not-a-uuid.secret`,
      `${sessionId}.secret.with.extra.separator`,
    ])('should reject malformed token %j', (token) => {
      expect(parseSessionToken(token)).toBeNull();
    });

    it('should accept a valid UUID session id and a non-empty secret', () => {
      expect(parseSessionToken(`${sessionId}.secret-value`)).toEqual({
        sessionId,
        secret: 'secret-value',
      });
    });
  });

  describe('hash and comparison', () => {
    it('should generate a deterministic SHA-256 hash', () => {
      expect(hashTokenSecret('same-secret')).toBe(
        hashTokenSecret('same-secret'),
      );
      expect(hashTokenSecret('same-secret')).toHaveLength(64);
    });

    it('should reject an incorrect, empty, or malformed expected hash', () => {
      const validHash = hashTokenSecret('correct-secret');

      expect(tokenHashMatches('wrong-secret', validHash)).toBe(false);
      expect(tokenHashMatches('correct-secret', '')).toBe(false);
      expect(tokenHashMatches('correct-secret', 'not-a-hex-hash')).toBe(false);
    });
  });
});
