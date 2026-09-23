import { hashPassword, verifyPassword } from './password.util.js';

describe('password.util', () => {
  it('should hash and verify the correct password', async () => {
    const hash = await hashPassword('StrongPassword!123');

    await expect(verifyPassword('StrongPassword!123', hash)).resolves.toBe(
      true,
    );
  });

  it('should create a different salted hash for the same password', async () => {
    const first = await hashPassword('StrongPassword!123');
    const second = await hashPassword('StrongPassword!123');

    expect(first).not.toBe(second);
  });

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword('StrongPassword!123');

    await expect(verifyPassword('WrongPassword!123', hash)).resolves.toBe(
      false,
    );
  });

  it.each([
    '',
    'plain-text-password',
    'unknown-version$salt$00',
    'scrypt-v1$$00',
    'scrypt-v1$salt$',
    'scrypt-v1$salt$not-hex',
    'scrypt-v1$salt$00',
  ])('should safely reject malformed stored hash %j', async (storedHash) => {
    await expect(verifyPassword('password', storedHash)).resolves.toBe(false);
  });

  it('should preserve password case and whitespace as significant input', async () => {
    const hash = await hashPassword(' CaseSensitivePassword ');

    await expect(verifyPassword(' CaseSensitivePassword ', hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword('casesensitivepassword', hash)).resolves.toBe(
      false,
    );
    await expect(verifyPassword('CaseSensitivePassword', hash)).resolves.toBe(
      false,
    );
  });
});
