import { useState, type FormEvent } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Paper } from '@mui/material';

// Props for the component, including a callback for when login is successful
interface LoginPageProps {
  onLoginSuccess: (token: string, role: string, username: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // State for form inputs, loading status, and error messages
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handles the form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If response is not OK, throw an error with the message from the backend
        throw new Error(data.message || 'Failed to log in');
      }

      // On success, call the parent component's onLoginSuccess function
      if (data.token) {
        onLoginSuccess(data.token, data.role, username);
      }

    } catch (err) {
      // Handle network errors or errors thrown from the response check
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 2, width: '100%' }}>
        <Typography variant="h5" align="center" gutterBottom>
          Admin Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
