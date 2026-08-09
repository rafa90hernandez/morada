const OPEN_CORS_ENVIRONMENTS = new Set(['development', 'test']);

function normalizeOrigin(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid CORS origin: ${value}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`CORS origin must use http or https: ${value}`);
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== '/' && parsed.pathname !== '')
  ) {
    throw new Error(`CORS origin must not contain credentials, path or query: ${value}`);
  }

  return parsed.origin;
}

export function resolveCorsOrigins(
  nodeEnv: string,
  configuredOrigins?: string,
): true | string[] {
  if (OPEN_CORS_ENVIRONMENTS.has(nodeEnv)) {
    return true;
  }

  const origins = (configuredOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  const uniqueOrigins = [...new Set(origins)];

  if (uniqueOrigins.length === 0) {
    throw new Error(
      'CORS_ORIGINS must contain at least one trusted origin outside development/test.',
    );
  }

  return uniqueOrigins;
}
