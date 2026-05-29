const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

function getApiBaseUrl() {
  if (
    process.env.NODE_ENV === 'production' &&
    /^http:\/\/localhost(?::3000)?\/?$/.test(configuredApiBaseUrl)
  ) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }

    return 'https://dumbthingsdaily.com/api';
  }

  return configuredApiBaseUrl.replace(/\/$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export const PUBLIC_DOCUMENT_EDITING =
  process.env.NEXT_PUBLIC_PUBLIC_DOCUMENT_EDITING !== 'false';
