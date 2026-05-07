export interface ApiRequestLogPayloadInput {
  method: string;
  path: string;
  status: number;
  errorCode?: string | null;
}

export function buildApiRequestLogPayload(input: ApiRequestLogPayloadInput) {
  const status = Number(input.status);
  const summary = status >= 200 && status < 300
    ? 'OK'
    : input.errorCode?.trim() || `HTTP_${status}`;

  return {
    action: 'api_request' as const,
    target: `${input.method.toUpperCase()} ${input.path} ${status}`,
    oldValue: undefined,
    newValue: summary,
  };
}
