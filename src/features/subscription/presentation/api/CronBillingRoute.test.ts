import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isCronAuthorized, GET, POST } from '@/app/api/cron/billing/route';

describe('Cron Billing Route Handler (app/api/cron/billing/route.ts)', () => {
  it('CRON_SECRET 환경 변수가 없으면 인증을 통과한다 (로컬 개발/테스트)', () => {
    const originalSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const request = new Request('http://localhost:3000/api/cron/billing');
    assert.strictEqual(isCronAuthorized(request), true);

    if (originalSecret) process.env.CRON_SECRET = originalSecret;
  });

  it('CRON_SECRET이 설정되어 있을 때 올바른 Bearer 토큰이 전달되면 인증을 통과한다', () => {
    const originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test_cron_secret_123';

    const validRequest = new Request('http://localhost:3000/api/cron/billing', {
      headers: {
        authorization: 'Bearer test_cron_secret_123',
      },
    });
    assert.strictEqual(isCronAuthorized(validRequest), true);

    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it('CRON_SECRET이 설정되어 있을 때 잘못된 토큰이나 헤더가 없으면 인증을 거부한다 (401 반환 검증)', async () => {
    const originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test_cron_secret_123';

    const invalidRequest = new Request('http://localhost:3000/api/cron/billing', {
      headers: {
        authorization: 'Bearer wrong_token',
      },
    });
    assert.strictEqual(isCronAuthorized(invalidRequest), false);

    const getRes = await GET(invalidRequest);
    assert.strictEqual(getRes.status, 401);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.success, false);
    assert.ok(getBody.error.includes('Unauthorized'));

    const postRes = await POST(invalidRequest);
    assert.strictEqual(postRes.status, 401);

    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });
});
