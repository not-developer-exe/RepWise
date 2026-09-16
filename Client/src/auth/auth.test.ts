import { describe, expect, it } from "vitest";
import { authService } from "./auth.service";

describe("authService", () => {
  it("exposes the authentication operations", () => {
    expect(authService.signIn).toBeTypeOf("function");
    expect(authService.signOut).toBeTypeOf("function");
    expect(authService.getSession).toBeTypeOf("function");
    expect(authService.onAuthStateChange).toBeTypeOf("function");
  });
});