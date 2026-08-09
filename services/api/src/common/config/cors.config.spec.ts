import { resolveCorsOrigins } from './cors.config';

describe('resolveCorsOrigins', () => {
  it('keeps development and test permissive for local tooling', () => {
    expect(resolveCorsOrigins('development')).toBe(true);
    expect(resolveCorsOrigins('test')).toBe(true);
  });

  it('requires an explicit allowlist outside development and test', () => {
    expect(() => resolveCorsOrigins('staging')).toThrow(
      'CORS_ORIGINS must contain at least one trusted origin',
    );
    expect(() => resolveCorsOrigins('production', '   ')).toThrow(
      'CORS_ORIGINS must contain at least one trusted origin',
    );
  });

  it('parses, normalizes and de-duplicates trusted origins', () => {
    expect(
      resolveCorsOrigins(
        'production',
        'https://morada.ie, https://app.morada.ie/,https://morada.ie',
      ),
    ).toEqual(['https://morada.ie', 'https://app.morada.ie']);
  });

  it('rejects malformed origins and non-http protocols', () => {
    expect(() => resolveCorsOrigins('production', 'morada.ie')).toThrow(
      'Invalid CORS origin',
    );
    expect(() => resolveCorsOrigins('production', 'file:///tmp/morada')).toThrow(
      'CORS origin must use http or https',
    );
  });

  it('rejects origins containing paths, queries or credentials', () => {
    expect(() =>
      resolveCorsOrigins('production', 'https://morada.ie/app'),
    ).toThrow('CORS origin must not contain credentials, path or query');
    expect(() =>
      resolveCorsOrigins('production', 'https://morada.ie?preview=true'),
    ).toThrow('CORS origin must not contain credentials, path or query');
    expect(() =>
      resolveCorsOrigins('production', 'https://user:pass@morada.ie'),
    ).toThrow('CORS origin must not contain credentials, path or query');
  });
});
