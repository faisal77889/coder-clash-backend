import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Test 3: Refresh Token Rotation", () => {
  it("should issue a new token using refresh token and invalidate old refresh token", async () => {
    const user = {
      email: "refreshuser@example.com",
      password: "PasswordToRefresh!"
    };

    // 1. Setup user and get initial tokens
    await request(app).post("/auth/register").send(user);
    const loginRes = await request(app).post("/auth/login").send(user);
    const initialRefreshToken = loginRes.body.refreshToken;

    // 2. Use refresh token to get a new access token
    const refreshRes = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty("accessToken");

    // 3. Attempt to reuse initial refresh token (must be rejected)
    const reuseRes = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: initialRefreshToken });

    expect([401, 403]).toContain(reuseRes.status);
  });
});
