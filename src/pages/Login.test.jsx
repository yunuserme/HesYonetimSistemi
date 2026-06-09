import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Login from "./Login.jsx";

const authMock = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  getDefaultPathForRole: () => "/",
  useAuth: () => ({
    isAuthenticated: false,
    isAuthenticating: false,
    signIn: authMock.signIn,
    user: null,
  }),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login", () => {
  beforeEach(() => {
    authMock.signIn.mockReset();
  });

  it("renders the login form fields and submit button", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: /sign in to continue/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a friendly error message for invalid credentials", async () => {
    const user = userEvent.setup();
    authMock.signIn.mockRejectedValue({ status: 401 });
    renderLogin();

    await user.type(screen.getByLabelText(/username/i), "wrong-user");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
  });

  it("does not expose mock wording in the login UI", () => {
    renderLogin();

    expect(document.body).not.toHaveTextContent(/mock/i);
  });
});
