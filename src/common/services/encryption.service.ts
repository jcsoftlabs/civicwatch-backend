import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(payload: string): string {
    const key = this.getKey();
    const [ivB64, tagB64, encryptedB64] = payload.split(':');

    if (!ivB64 || !tagB64 || !encryptedB64) {
      throw new InternalServerErrorException('Payload chiffre invalide.');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  isConfigured() {
    return Boolean(this.configService.get<string>('ENCRYPTION_KEY'));
  }

  private getKey() {
    const secret = this.configService.get<string>('ENCRYPTION_KEY');
    if (!secret) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY est requis pour stocker des cles API de maniere securisee.',
      );
    }

    return createHash('sha256').update(secret).digest();
  }
}
