import { useState, useEffect, type FormEvent } from 'react';
import './Users.css';

// The User type is now defined directly in this file
interface User {
  uuid: string;
  username: string;
  role: 'user' | 'admin';
}

interface UsersPageProps {
  authToken: string;
  onLogout: () => void;
}

// Main component for the entire page
export function UsersPage({ authToken, onLogout }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to fetch users from the API
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users. You may not have permission.');
      }
      const data: User[] = await response.json();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users when the component mounts
  useEffect(() => {
    fetchUsers();
  }, [authToken]); // Re-fetch if token changes, though it shouldn't in this flow

  return (
    <div className="users-page-container">
      <header className="users-page-header">
        <h1>User Management</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <Toolbar onOpenCreateModal={() => setIsModalOpen(true)} />

      {isLoading && <p>Loading users...</p>}
      {error && <p className="error-message">{error}</p>}
      {!isLoading && !error && <UserTable users={users} />}

      {isModalOpen && (
        <CreateUserModal
          authToken={authToken}
          onClose={() => setIsModalOpen(false)}
          onUserCreated={() => {
            setIsModalOpen(false);
            fetchUsers(); // Refresh the user list
          }}
        />
      )}
    </div>
  );
}

// --- Helper Components defined in the same file ---

// Toolbar with the "Create User" button
function Toolbar({ onOpenCreateModal }: { onOpenCreateModal: () => void }) {
  return (
    <div className="toolbar">
      <button onClick={onOpenCreateModal}>Create New User</button>
    </div>
  );
}

// Table to display users
function UserTable({ users }: { users: User[] }) {
  return (
    <table className="users-table">
      <thead>
        <tr>
          <th>UUID</th>
          <th>Username</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.uuid}>
            <td>{user.uuid}</td>
            <td>{user.username}</td>
            <td>{user.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Modal for the user creation form
interface CreateUserModalProps {
  authToken: string;
  onClose: () => void;
  onUserCreated: () => void;
}

function CreateUserModal({ authToken, onClose, onUserCreated }: CreateUserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user.');
      }
      onUserCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New User</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="new-username">Username</label>
            <input id="new-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="input-group">
            <label htmlFor="new-password">Password</label>
            <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label htmlFor="new-role">Role</label>
            <select id="new-role" value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
