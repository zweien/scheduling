import type { NextRequest } from 'next/server';
import type { AccountRole } from '@/types';
import { addApiRequestLog } from './logs';

interface ApiRequestLogActor {
  username?: string | null;
  role?: AccountRole | null;
}

interface ApiRequestLogOptions<TContext> {
  loadContext?: (request: NextRequest) => TContext | Promise<TContext>;
  getActor?: (context: TContext) => ApiRequestLogActor | null | Promise<ApiRequestLogActor | null>;
}

interface ApiErrorPayload {
  error?: {
    code?: unknown;
  };
}

async function getApiErrorCode(response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return undefined;
  }

  const payload = await response.clone().json().catch(() => null) as ApiErrorPayload | null;
  return typeof payload?.error?.code === 'string' ? payload.error.code : undefined;
}

export async function withApiRequestLog<TContext = null>(
  request: NextRequest,
  handler: (context: TContext) => Response | Promise<Response>,
  options: ApiRequestLogOptions<TContext> = {}
) {
  const context = options.loadContext
    ? await options.loadContext(request)
    : (null as TContext);

  const response = await handler(context);
  const actor = options.getActor
    ? await options.getActor(context)
    : null;
  const errorCode = await getApiErrorCode(response);

  addApiRequestLog(
    {
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      errorCode,
    },
    request,
    actor
  );

  return response;
}
