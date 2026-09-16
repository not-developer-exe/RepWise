import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

function AuthProbe() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return <div>{user ? user.email : "Not authenticated"}</div>;
}

describe("AuthProvider", () => {
  it("provides an authentication state to the application", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("Not authenticated"),
    ).toBeInTheDocument();
  });
});