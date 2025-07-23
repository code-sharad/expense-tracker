import React from 'react';
import { useNavigate } from 'react-router';

interface User {
  _id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  authToken: string | null;
  handleLogin: ({ email, password }: { email: string; password: string }) => Promise<void>;
  handleLogout: () => Promise<void>;
  currentUser: User | null;
}

const AuthContext = React.createContext<AuthContextType>({
  authToken: null,
  handleLogin: async () => { },
  handleLogout: async () => { },
  currentUser: null,
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = React.useState<string | null>(localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = React.useState<User | null>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
  const navigate = useNavigate();

  async function handleLogin({ email, password }: { email: string, password: string }) {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = await response.json();
      localStorage.setItem('authToken', data.token); // Store token in localStorage
      localStorage.setItem('currentUser', JSON.stringify(data.user)); // Store user in localStorage
      setAuthToken(data.token);
      setCurrentUser(data.user);
      switch (data.user.role) {
        case 'ADMIN':
          navigate('/'); // Redirect to the dashboard or home page after login
          break;
        case 'EMPLOYEE':
          navigate('/create-expense'); // Redirect to create expense page after login
          break;
        case 'MANAGER':
          navigate('/manager'); // Redirect to manager page after Login
          break;
        default:
          navigate('/'); // Default redirect
          break;
      }
      console.log('Login successful:', data);
    } catch (error) {
      setAuthToken(null);
      setCurrentUser(null);
      console.error('Login failed:', error);
    }
  }

  async function handleLogout() {
    const response = await fetch('/logout', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    setAuthToken(null);
    setCurrentUser(null);
    console.log('Logged out successfully');
  }

  return (
    <AuthContext.Provider value={{ currentUser, authToken, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}



export { AuthContext, AuthProvider };
