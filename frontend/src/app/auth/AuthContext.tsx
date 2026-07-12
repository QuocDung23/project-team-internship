import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  hasUsableStoredAuthToken,
  loginUser,
  TOKEN_STORAGE_KEY,
  type AuthUser,
} from "../services/backendApi";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!hasUsableStoredAuthToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser();
        if (active) setUser(currentUser);
      } catch {
        if (active) logout();
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadUser();
    return () => {
      active = false;
    };
  }, [logout]);

  useEffect(() => {
    window.addEventListener("drowsiness:unauthorized", logout);
    return () => window.removeEventListener("drowsiness:unauthorized", logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginUser(email, password);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    setUser(response.user);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
