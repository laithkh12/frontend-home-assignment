import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Typography } from '@mui/material';

interface AboutPageProps {
  authToken: string;
  currentUser: string;
  onLogout: () => void;
}

export function AboutPage({ authToken, currentUser, onLogout }: AboutPageProps) {
  const [role, setRole] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await fetch('/api/users/me', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setRole(data.role);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();
  }, [authToken]);

  return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <Card sx={{ maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            About My Account
          </Typography>
          <Typography variant="body1">Username: {currentUser}</Typography>
          <Typography variant="body1">Role: {role}</Typography>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/users')}
            >
              Back
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={onLogout}
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
