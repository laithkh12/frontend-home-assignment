import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { UsersPage } from './pages/Users';
import { AboutPage } from './pages/About';

/**
 * A wrapper component to manage routing logic.
 * We need this because the useNavigate hook can only be used inside a Router component.
 */
function AppRoutes() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('currentUser'));

  const handleLoginSuccess = (token: string, role: string, username: string) => {
    if (role !== 'admin') {
      alert('Login failed: Only admin users are allowed.');
      return;
    }
    setAuthToken(token);
    setCurrentUser(username);
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', username);
    navigate('/users'); // Redirect to users page on successful login

    // I did this to check is the user have about page
    /**
     * setAuthToken(token);
     * setCurrentUser(username);
     * localStorage.setItem('authToken', token);
     * localStorage.setItem('currentUser', username);
     * localStorage.setItem('role', role);
     * navigate('/users'); 
     */
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null)
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    navigate('/login'); // Redirect to login page on logout
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
      <Route
        path="/users"
        element={
          authToken ? (
            <UsersPage authToken={authToken} currentUser={currentUser ?? ''} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" /> // Protect this route
          )
        }
      />
      <Route
        path="/about"
        element={
          authToken ? (
            <AboutPage authToken={authToken} currentUser={currentUser ?? ''} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      {/* Default route redirects based on auth status */}
      <Route path="*" element={<Navigate to={authToken ? "/users" : "/login"} />} />
    </Routes>
  );
}

// The main App component now just sets up the Router
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
