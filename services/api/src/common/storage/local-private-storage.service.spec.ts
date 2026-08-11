import { LocalPrivateStorageService } from './local-private-storage.service';

describe('LocalPrivateStorageService', () => {
  const createService = (nodeEnv: string) =>
    new LocalPrivateStorageService({
      get: jest.fn().mockReturnValue(nodeEnv),
    } as never);

  it.each(['staging', 'production'])(
    'fails closed in %s until an approved private storage provider is configured',
    (nodeEnv) => {
      expect(() => createService(nodeEnv)).toThrow(
        'Local private storage is disabled outside development/test.',
      );
    },
  );

  it.each(['development', 'test'])(
    'allows local private storage in %s',
    (nodeEnv) => {
      expect(() => createService(nodeEnv)).not.toThrow();
    },
  );

  it('rejects object keys that escape the private storage root', async () => {
    const service = createService('test');

    await expect(
      service.upload({
        key: '../outside.jpg',
        body: Buffer.from('private'),
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow('Invalid private storage object key');
  });
});
