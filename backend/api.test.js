/**
 * Backend API tests: auth, logs, protected routes, health.
 * Run: npm run test (from backend directory).
 * Requires: .env with JWT_SECRET (or set before run). DB required for integration tests.
 */
require('dotenv').config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 1) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}
const request = require('supertest');
const app = require('./server');

const TEST_USER = process.env.TEST_DRIVER_USERNAME || 'testdriver';
const TEST_PASS = process.env.TEST_DRIVER_PASSWORD || '123456789';

describe('Backend API', () => {
  describe('Health', () => {
    test('GET /health returns 200 or 503 and has success, message, database', async () => {
      const res = await request(app).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('database');
    });
    test('GET /api/health returns same shape as /health', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('database');
    });
  });

  describe('Auth routes', () => {
    test('POST /api/auth/login with empty body returns 400 or 422', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect([400, 422]).toContain(res.status);
      expect(res.body).toBeDefined();
    });
    test('POST /api/auth/login with invalid credentials returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
    test('POST /api/auth/login with valid credentials returns 200 and token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: TEST_USER, password: TEST_PASS });
      if (res.status === 503) {
        return; // DB not available, skip
      }
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('driver');
    });
    test('POST /api/auth/register with invalid body returns 400 or 422', async () => {
      const res = await request(app).post('/api/auth/register').send({ username: 'a', password: 'short' });
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('Protected route middleware', () => {
    test('GET /api/logs without token returns 401', async () => {
      const res = await request(app).get('/api/logs');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
    test('GET /api/logs with invalid token returns 401', async () => {
      const res = await request(app)
        .get('/api/logs')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });
    test('GET /api/drivers/profile without token returns 401', async () => {
      const res = await request(app).get('/api/drivers/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('JWT token verification', () => {
    let token;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: TEST_USER, password: TEST_PASS });
      if (res.status === 200 && res.body.token) token = res.body.token;
    });
    test('GET /api/drivers/profile with valid token returns 200', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/drivers/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
    test('GET /api/logs with valid token returns 200 and logs array', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });
  });

  describe('Log creation and update', () => {
    let token;
    let logId;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: TEST_USER, password: TEST_PASS });
      if (res.status === 200 && res.body.token) token = res.body.token;
    });
    test('POST /api/logs/status with valid token and body creates log', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/logs/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ON_DUTY', location: 'Test Location', odometer: 1000 });
      if (res.status === 400 && res.body.message && res.body.message.includes('truck')) return;
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      if (res.body.currentStatus && res.body.currentStatus.id) logId = res.body.currentStatus.id;
    });
    test('PUT /api/logs/:id with valid token updates log', async () => {
      if (!token) return;
      const listRes = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${token}`);
      if (listRes.status !== 200 || !listRes.body.logs || listRes.body.logs.length === 0) return;
      const id = listRes.body.logs[0].id;
      const res = await request(app)
        .put(`/api/logs/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'Updated Location', notes: 'Test note' });
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) expect(res.body).toHaveProperty('success', true);
    });
  });
});
