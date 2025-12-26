import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Search } from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';

export const ConnectionsPage: React.FC = () => {
  const { connections, filteredConnections, searchQuery, setSearchQuery } = useConnectionStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-3">SSH Connections</h1>
          <p className="text-text-secondary text-lg">Manage your SSH connection configurations</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          Add Connection
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {filteredConnections.length > 0 ? (
          <div className="space-y-2">
            {filteredConnections.map((conn) => (
              <div
                key={conn.id}
                className="p-4 bg-background rounded-md border border-border hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{conn.name}</p>
                    <p className="text-sm text-text-secondary">{conn.host}:{conn.port}</p>
                  </div>
                  {conn.isFavorite && (
                    <span className="text-warning">★</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">
              {connections.length === 0
                ? 'No connections yet. Add your first SSH connection to get started.'
                : 'No connections match your search.'}
            </p>
            {connections.length === 0 && (
              <Button variant="primary" leftIcon={<Plus size={16} />}>
                Add Connection
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

