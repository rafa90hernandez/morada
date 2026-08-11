import { Logger } from '@nestjs/common';

import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  it('logs only the path without query strings or client fingerprint fields', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    let finish: (() => void) | undefined;
    const response = {
      statusCode: 200,
      on: jest.fn((event: string, listener: () => void) => {
        if (event === 'finish') finish = listener;
        return response;
      }),
    };
    const next = jest.fn();
    const request = {
      requestId: 'request-1',
      method: 'GET',
      path: '/api/v1/discovery/listings',
      originalUrl:
        '/api/v1/discovery/listings?area=private-search&token=must-not-log',
      ip: '203.0.113.10',
      get: jest.fn().mockReturnValue('sensitive-user-agent'),
    };

    new LoggerMiddleware().use(request as never, response as never, next);
    finish?.();

    expect(next).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;

    expect(payload).toMatchObject({
      requestId: 'request-1',
      method: 'GET',
      path: '/api/v1/discovery/listings',
      statusCode: 200,
    });
    expect(payload).not.toHaveProperty('ip');
    expect(payload).not.toHaveProperty('userAgent');

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('private-search');
    expect(serialized).not.toContain('must-not-log');
    expect(serialized).not.toContain('203.0.113.10');
    expect(serialized).not.toContain('sensitive-user-agent');

    log.mockRestore();
  });
});
