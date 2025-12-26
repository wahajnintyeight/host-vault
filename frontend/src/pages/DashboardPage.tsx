import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Server, Code, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useConnectionStore } from '../store/connectionStore';
import { useAuthStore } from '../store/authStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { connections } = useConnectionStore();
  const { user } = useAuthStore();

  const favoriteConnections = connections.filter((conn) => conn.isFavorite).slice(0, 5);
  const recentConnections = connections.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-text-primary mb-3">
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="text-text-secondary text-lg">Manage your SSH connections and commands</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Total Connections</p>
              <p className="text-2xl font-bold text-text-primary">{connections.length}</p>
            </div>
            <Server className="text-primary" size={32} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Favorite Connections</p>
              <p className="text-2xl font-bold text-text-primary">
                {connections.filter((c) => c.isFavorite).length}
              </p>
            </div>
            <Server className="text-warning" size={32} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Commands</p>
              <p className="text-2xl font-bold text-text-primary">0</p>
            </div>
            <Code className="text-success" size={32} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Favorite Connections</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.CONNECTIONS)}
            >
              View All
            </Button>
          </div>
          {favoriteConnections.length > 0 ? (
            <div className="space-y-2">
              {favoriteConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-3 bg-background rounded-md border border-border hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`${ROUTES.CONNECTIONS}/${conn.id}`)}
                >
                  <p className="font-medium text-text-primary">{conn.name}</p>
                  <p className="text-sm text-text-secondary">{conn.host}:{conn.port}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="text-text-muted mx-auto mb-2" size={48} />
              <p className="text-text-secondary mb-4">No favorite connections yet</p>
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.CONNECTIONS)}
                leftIcon={<Plus size={16} />}
              >
                Add Connection
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Connections</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.CONNECTIONS)}
            >
              View All
            </Button>
          </div>
          {recentConnections.length > 0 ? (
            <div className="space-y-2">
              {recentConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="p-3 bg-background rounded-md border border-border hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`${ROUTES.CONNECTIONS}/${conn.id}`)}
                >
                  <p className="font-medium text-text-primary">{conn.name}</p>
                  <p className="text-sm text-text-secondary">{conn.host}:{conn.port}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="text-text-muted mx-auto mb-2" size={48} />
              <p className="text-text-secondary mb-4">No connections yet</p>
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.CONNECTIONS)}
                leftIcon={<Plus size={16} />}
              >
                Add Connection
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

