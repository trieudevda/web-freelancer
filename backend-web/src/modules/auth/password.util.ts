import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const PASSWORD_VERSION = 'scrypt-v1';
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return [PASSWORD_VERSION, salt, derivedKey.toString('hex')].join('$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [version, salt, expectedHex] = storedHash.split('$');

  if (version !== PASSWORD_VERSION || !salt || !expectedHex) {
    return false;
  }

  let expected: Buffer;

  try {
    expected = Buffer.from(expectedHex, 'hex');
  } catch {
    return false;
  }

  if (expected.length !== KEY_LENGTH) {
    return false;
  }

  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return timingSafeEqual(actual, expected);
}
