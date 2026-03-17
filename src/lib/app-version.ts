function normalizeVersion(rawVersion: string | null | undefined) {
  const value = rawVersion?.trim();

  if (!value) {
    return null;
  }

  return value.startsWith('v') ? value : `v${value}`;
}

export function getDisplayVersion(primary?: string | null, fallback?: string | null) {
  return normalizeVersion(primary) ?? normalizeVersion(fallback) ?? 'v0.0.0-dev';
}

export function getAppVersion() {
  return getDisplayVersion(process.env.APP_VERSION);
}
