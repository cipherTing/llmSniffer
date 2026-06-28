import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './redis/redis.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getConnectionToken(),
          useValue: {
            db: {
              admin: () => ({
                ping: jest.fn().mockResolvedValue({ ok: 1 }),
              }),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            ping: jest.fn().mockResolvedValue('PONG'),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns API status text', () => {
      expect(appController.getHello()).toBe('LLMSniffer API is running.');
    });
  });

  describe('health', () => {
    it('checks API dependencies', async () => {
      await expect(appController.getHealth()).resolves.toMatchObject({
        ok: true,
        service: 'llmsniffer-api',
        dependencies: {
          mongo: { ok: true },
          redis: { ok: true },
        },
      });
    });
  });
});
