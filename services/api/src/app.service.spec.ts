import { ServiceUnavailableException } from '@nestjs/common';

import { AppService } from './app.service';

describe('AppService health contracts', () => {
  const createService = (overrides?: {
    database?: jest.Mock;
    storage?: jest.Mock;
    privateStorage?: jest.Mock;
  }) => {
    const database = {
      $queryRaw: overrides?.database ?? jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const storage = {
      healthCheck: overrides?.storage ?? jest.fn().mockResolvedValue(undefined),
    };
    const privateStorage = {
      healthCheck:
        overrides?.privateStorage ?? jest.fn().mockResolvedValue(undefined),
    };

    return {
      service: new AppService(database as never, storage as never, privateStorage as never),
      database,
      storage,
      privateStorage,
    };
  };

  it('returns liveness without touching dependencies', () => {
    const { service, database, storage, privateStorage } = createService();

    expect(service.getLiveness()).toEqual({ status: 'ok' });
    expect(database.$queryRaw).not.toHaveBeenCalled();
    expect(storage.healthCheck).not.toHaveBeenCalled();
    expect(privateStorage.healthCheck).not.toHaveBeenCalled();
  });

  it('reports ready only after database and both storage boundaries succeed', async () => {
    const { service, database, storage, privateStorage } = createService();

    await expect(service.getReadiness()).resolves.toEqual({ status: 'ready' });
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    expect(storage.healthCheck).toHaveBeenCalledTimes(1);
    expect(privateStorage.healthCheck).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['database', { database: jest.fn().mockRejectedValue(new Error('postgresql://secret')) }],
    ['public storage', { storage: jest.fn().mockRejectedValue(new Error('/private/path')) }],
    ['private storage', { privateStorage: jest.fn().mockRejectedValue(new Error('object-key')) }],
  ] as const)('returns a minimal 503 when %s is unavailable', async (_name, overrides) => {
    const { service } = createService(overrides);

    await expect(service.getReadiness()).rejects.toMatchObject({
      response: { status: 'not_ready' },
      status: 503,
    } satisfies Partial<ServiceUnavailableException>);

    try {
      await service.getReadiness();
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain('postgresql://secret');
      expect(JSON.stringify(error)).not.toContain('/private/path');
      expect(JSON.stringify(error)).not.toContain('object-key');
    }
  });
});
