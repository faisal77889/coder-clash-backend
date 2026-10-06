import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Test 2: Login & Protected Route", () => {
  it("should validate credentials, issue tokens on login, and protect /me endpoint", async () => {
    const user = {
      email: "loginuser@example.com",
      password: "SecretPassword123"
    };

    // 1. Setup user
    await request(app).post("/auth/register").send(user);

    // 2. Reject wrong password
    const wrongPassRes = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "WrongPassword" });
    expect(wrongPassRes.status).toBe(401);

    // 3. Reject access to /me without token
    const unauthMeRes = await request(app).get("/me");
    expect(unauthMeRes.status).toBe(401);

    // 4. Successful login
    const loginRes = await request(app)
      .post("/auth/login")
      .send(user);

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("accessToken");
    expect(loginRes.body).toHaveProperty("refreshToken");

    // 5. Access /me with valid Bearer token
    const token = loginRes.body.accessToken;
    const meRes = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty("email", user.email);
  });
});
