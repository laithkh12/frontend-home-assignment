import { useState, useEffect } from 'react';
import { LoginPage } from './pages/Login.tsx';

function App() {
  // State to hold the auth token. It's null when logged out.
  const [authToken, setAuthToken] = useState<string | null>(null);

  // On initial load, check if a token exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    }
  }, []);

  // Callback function for successful login
  const handleLoginSuccess = (token: string, role: string) => {
    // For now, we only care about admins
    if (role !== 'admin') {
      alert('Login failed: Only admin users are allowed.');
      return;
    }
    setAuthToken(token);
    localStorage.setItem('authToken', token); // Persist token
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('authToken'); // Clear token
  };

  // If there's no token, show the login page
  if (!authToken) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in, show the main application content
  return (
    <div>
      <h1>Welcome, Admin!</h1>
      <p>This is the main application.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default App;
