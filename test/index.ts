import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';
import { prisma } from '../prisma/lib/prisma';

describe('Signup Endpoint', () => {
  // Clean up before test
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com'
      }
    });
  });

  test('POST /signup should create a new user', async () => {
    const newUser = {
      email: 'test@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/signup')
      .send(newUser);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('user created successfully');
    expect(response.body.data.email).toBe('test@example.com');
  });

  // Clean up after test
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com'
      }
    });
    await prisma.$disconnect();
  });
});