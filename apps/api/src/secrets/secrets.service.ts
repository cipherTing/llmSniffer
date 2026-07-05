import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class SecretsService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    this.key = parseKey(configService.getOrThrow<string>('PROBE_SECRET_KEY'));
  }

  encrypt(plaintext: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decrypt(value: string) {
    const [version, ivValue, tagValue, encryptedValue] = value.split(':');
    if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
      throw new Error('Invalid encrypted secret format');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}

function parseKey(value: string) {
  const normalized = value.trim();
  const key = Buffer.from(
    normalized,
    normalized.includes('-') || normalized.includes('_')
      ? 'base64url'
      : 'base64',
  );
  if (key.length !== 32) {
    throw new Error('PROBE_SECRET_KEY must decode to 32 bytes');
  }
  return key;
}
