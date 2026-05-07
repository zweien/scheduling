import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/api-request-log.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

test('成功状态会生成 METHOD PATH STATUS 和 OK 摘要', async () => {
  const { buildApiRequestLogPayload } = await loadModule();

  assert.deepEqual(
    buildApiRequestLogPayload({
      method: 'GET',
      path: '/api/schedules',
      status: 200,
      errorCode: null,
    }),
    {
      action: 'api_request',
      target: 'GET /api/schedules 200',
      oldValue: undefined,
      newValue: 'OK',
    }
  );
});

test('失败状态优先使用错误码，否则回退到 HTTP_<status>', async () => {
  const { buildApiRequestLogPayload } = await loadModule();

  assert.deepEqual(
    buildApiRequestLogPayload({
      method: 'GET',
      path: '/api/schedules/monthly-markdown',
      status: 400,
      errorCode: 'INVALID_INPUT',
    }),
    {
      action: 'api_request',
      target: 'GET /api/schedules/monthly-markdown 400',
      oldValue: undefined,
      newValue: 'INVALID_INPUT',
    }
  );

  assert.deepEqual(
    buildApiRequestLogPayload({
      method: 'GET',
      path: '/api/custom',
      status: 500,
      errorCode: null,
    }),
    {
      action: 'api_request',
      target: 'GET /api/custom 500',
      oldValue: undefined,
      newValue: 'HTTP_500',
    }
  );
});
