import { useState, useEffect, type FormEvent } from 'react';
import './Users.css';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

// The User type definition
interface User {
  uuid: string;
  username: string;
  role: 'user' | 'admin';
}

interface UsersPageProps {
  authToken: string;
  currentUser: string;
  onLogout: () => void;
}

// Main component for the entire page
export function UsersPage({ authToken,currentUser, onLogout }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const navigate = useNavigate();

  // New state for toast-style notifications
  const [notification, setNotification] = useState<string | null>(null);

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
      // Use the main error state for critical fetch failures
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [authToken]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Prevent self-deletion at the handler level as a safety net
    if (userToDelete.username === currentUser) {
      setUserToDelete(null);
      return;
    }

    try {
      const response = await fetch(`/api/users/${userToDelete.uuid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user.');
      }

      setUserToDelete(null); // Close the confirmation modal
      fetchUsers(); // Refresh the user list

    } catch (err) {
      // For non-critical errors, show a notification instead of replacing the page
      setNotification((err as Error).message);
      setUserToDelete(null); // Close modal on error
    }
  };

  return (
    <div className="users-page-container">
      {/* Render the notification if one exists */}
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <header className="users-page-header">
        <h1>User Management</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="outlined" onClick={() => navigate('/about')}>
            About My Account
          </Button>
          <button onClick={() => setConfirmLogout(true)} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <Toolbar onOpenCreateModal={() => setIsModalOpen(true)} />

      {isLoading && <p>Loading users...</p>}
      {/* The main error message is only for critical load failures */}
      {error && <p className="error-message">{error}</p>}

      {/* The table is no longer hidden by non-critical errors */}
      {!isLoading && !error && (
        <UserTable
          users={users}
          currentUser={currentUser} // pass the current user down to the table
          onDeleteClick={(user) => {
            // Guard here too so the modal never opens for self
            if (user.username === currentUser) return;
            setUserToDelete(user);
          }}
        />
      )}

      {isModalOpen && (
        <CreateUserModal
          authToken={authToken}
          onClose={() => setIsModalOpen(false)}
          onUserCreated={() => {
            setIsModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {userToDelete && (
        <ConfirmDeleteModal
          user={userToDelete}
          onConfirm={handleDeleteUser}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      {confirmLogout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out?</p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="logout-button"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

// --- Helper Components ---

// Notification component
function Notification({ message, onClose }: { message: string; onClose: () => void; }) {
  // Automatically close the notification after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="notification error">
      <p>{message}</p>
      <button onClick={onClose} className="close-button">&times;</button>
    </div>
  );
}

// Toolbar with the "Create User" button
function Toolbar({ onOpenCreateModal }: { onOpenCreateModal: () => void }) {
  return (
    <div className="toolbar">
      <button onClick={onOpenCreateModal}>Create New User</button>
    </div>
  );
}

// Table to display users
function UserTable({ users, currentUser, onDeleteClick }: { users: User[]; currentUser: string; onDeleteClick: (user: User) => void; }) {
  return (
    <table className="users-table">
      <thead>
        <tr>
          <th>UUID</th>
          <th>Username</th>
          <th>Role</th>
          <th className="actions-column">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.uuid}>
            <td>{user.uuid}</td>
            <td>{user.username}</td>
            <td>{user.role}</td>
            <td className="actions-column">
              {/* Hide Delete for the currently logged-in user */}
              {user.username !== currentUser && (
                <button onClick={() => onDeleteClick(user)} className="delete-button">
                  Delete
                </button>
              )}
            </td>
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

// Component for confirming deletion
function ConfirmDeleteModal({ user, onConfirm, onCancel }: { user: User; onConfirm: () => void; onCancel: () => void; }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm Deletion</h2>
        <p>
          Are you sure you want to delete the user "<strong>{user.username}</strong>"?
          This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} className="delete-button">Delete</button>
        </div>
      </div>
    </div>
  );
}
