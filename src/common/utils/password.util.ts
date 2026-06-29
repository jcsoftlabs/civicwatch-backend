import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(value: string) {
  return bcrypt.hash(value, SALT_ROUNDS);
}

export async function comparePassword(value: string, passwordHash: string) {
  return bcrypt.compare(value, passwordHash);
}
