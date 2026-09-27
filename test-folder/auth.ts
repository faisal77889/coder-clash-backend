import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './src/middleware';

describe('authenticateToken Middleware', () => {
  const TEST_SECRET = 'super-secret-jwt-key';
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;

    req = {
      headers: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 401 if Authorization header is missing', () => {
    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header does not start with Bearer', () => {
    req.headers['authorization'] = 'Basic dXNlcjpwYXNz';

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is signed with an invalid secret', () => {
    const fakeToken = jwt.sign({ userId: '123', role: 'user' }, 'wrong-secret');
    req.headers['authorization'] = `Bearer ${fakeToken}`;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is expired', () => {
    const expiredToken = jwt.sign({ userId: '123', role: 'user' }, TEST_SECRET, {
      expiresIn: '-1s',
    });
    req.headers['authorization'] = `Bearer ${expiredToken}`;

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach decoded payload to req.user and call next() on valid token', () => {
    const payload = { userId: 'usr_456', role: 'admin' };
    const validToken = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
    req.headers['authorization'] = `Bearer ${validToken}`;

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(payload.userId);
    expect(req.user.role).toBe(payload.role);
    expect(res.status).not.toHaveBeenCalled();
    console.log("printed")
  });
});