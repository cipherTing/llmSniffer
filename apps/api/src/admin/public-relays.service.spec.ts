import { PublicRelaysService } from './public-relays.service';

describe('PublicRelaysService', () => {
  it('returns the cached public relay snapshot without rebuilding', async () => {
    const cached = {
      generatedAt: '2026-07-05T00:00:00.000Z',
      relays: [{ id: 'site-1', channels: [] }],
    };
    const redisService = { getJson: jest.fn().mockResolvedValue(cached) };
    const snapshotModel = { findOne: jest.fn() };
    const snapshotService = { rebuildPublicRelaysSnapshot: jest.fn() };
    const service = new PublicRelaysService(
      redisService as never,
      snapshotModel as never,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot).toBe(cached);
    expect(snapshotModel.findOne).not.toHaveBeenCalled();
    expect(snapshotService.rebuildPublicRelaysSnapshot).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot)).not.toContain('apiKey');
  });

  it('returns the persisted snapshot before rebuilding from probes', async () => {
    const persistedSnapshot = {
      generatedAt: '2026-07-05T00:10:00.000Z',
      relays: [{ id: 'site-2', channels: [] }],
    };
    const redisService = { getJson: jest.fn().mockResolvedValue(null) };
    const snapshotModel = {
      findOne: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({ snapshot: persistedSnapshot }),
      })),
    };
    const snapshotService = { rebuildPublicRelaysSnapshot: jest.fn() };
    const service = new PublicRelaysService(
      redisService as never,
      snapshotModel as never,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot).toBe(persistedSnapshot);
    expect(snapshotModel.findOne).toHaveBeenCalledWith({
      key: 'public:relays:snapshot',
    });
    expect(snapshotService.rebuildPublicRelaysSnapshot).not.toHaveBeenCalled();
  });

  it('returns an empty snapshot when no cached or persisted snapshot exists', async () => {
    const redisService = { getJson: jest.fn().mockResolvedValue(null) };
    const snapshotModel = {
      findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })),
    };
    const service = new PublicRelaysService(
      redisService as never,
      snapshotModel as never,
    );

    const snapshot = await service.getSnapshot();

    expect(typeof snapshot.generatedAt).toBe('string');
    expect(snapshot.relays).toEqual([]);
  });
});
