import { ConfigService } from '@nestjs/config';
import { SecretsService } from './secrets.service';

describe('SecretsService', () => {
  it('encrypts and decrypts API keys without returning the plaintext as ciphertext', () => {
    const key = Buffer.alloc(32, 7).toString('base64url');
    const service = new SecretsService({
      getOrThrow: () => key,
    } as never as ConfigService);

    const encrypted = service.encrypt('sk-test-value');

    expect(encrypted).not.toContain('sk-test-value');
    expect(service.decrypt(encrypted)).toBe('sk-test-value');
  });
});
