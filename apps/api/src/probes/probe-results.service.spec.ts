import { ProbeResultsService } from './probe-results.service';

describe('ProbeResultsService', () => {
  it('upserts by site, probe, region, and bucket start', async () => {
    const findOneAndUpdate = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ _id: 'result-1' }) }));
    const service = new ProbeResultsService({ findOneAndUpdate } as never);

    await service.upsertResult({
      siteId: 'site-1',
      probeId: 'probe-1',
      region: 'default',
      provider: 'OpenAI',
      modelName: 'gpt-4o-mini',
      bucketStart: new Date('2026-07-05T00:00:00.000Z'),
      scheduledAt: new Date('2026-07-05T00:00:00.000Z'),
      startedAt: new Date('2026-07-05T00:00:01.000Z'),
      firstTokenAt: new Date('2026-07-05T00:00:02.000Z'),
      finishedAt: new Date('2026-07-05T00:00:03.000Z'),
      firstTokenLatencyMs: 1000,
      totalLatencyMs: 2000,
      status: 'ok',
      httpStatus: 200,
      errorCode: null,
      reason: '收到首个 token',
      attempt: 1,
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { siteId: 'site-1', probeId: 'probe-1', region: 'default', bucketStart: new Date('2026-07-05T00:00:00.000Z') },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'ok' }) }),
      { new: true, upsert: true, runValidators: true },
    );
  });
});
