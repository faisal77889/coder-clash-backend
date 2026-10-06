import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Test 1: Registration Flow", () => {
  it("should successfully register a user and reject duplicate email with 409", async () => {
    const user = {
      email: "testuser1@example.com",
      password: "Password123!"
    };

    // 1. Successful registration
    const registerRes = await request(app)
      .post("/auth/register")
      .send(user);

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty("email", user.email);
    expect(registerRes.body).not.toHaveProperty("password");
    expect(registerRes.body).not.toHaveProperty("passwordHash");

    // 2. Duplicate registration attempt
    const duplicateRes = await request(app)
      .post("/auth/register")
      .send(user);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body).toHaveProperty("error");
  });
});
