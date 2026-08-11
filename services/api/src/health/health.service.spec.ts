jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns liveness without dependency details', () => {
    const service = new HealthService({} as never, {} as never, {} as never);

    expect(service.live()).toEqual({ status: 'ok' });
  });

  it('returns ready when critical dependencies are available', async () => {
    const database = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new HealthService(
      database as never,
      {} as never,
      {} as never,
    );

    await expect(service.ready()).resolves.toEqual({ status: 'ready' });
  });

  it('fails closed without exposing dependency details', async () => {
    const database = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    };
    const service = new HealthService(
      database as never,
      {} as never,
      {} as never,
    );

    await expect(service.ready()).resolves.toEqual({ status: 'unavailable' });
  });
});
