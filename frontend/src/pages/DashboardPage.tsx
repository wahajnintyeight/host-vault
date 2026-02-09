import React, { useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  Wifi, 
  Plus, 
  Command, 
  Hash, 
  Activity,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useConnectionStore } from '../store/connectionStore';
import { useAuthStore } from '../store/authStore';
import { loadConnectionsFromFile } from '../lib/storage/connectionStorage';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { connections, setSelectedConnection, setConnections } = useConnectionStore();
  const { isGuestMode, user } = useAuthStore();

  useEffect(() => {
    // Load connections from file storage
    const loadConnections = async () => {
      try {
        const userId = user?.id;
        const loadedConnections = await loadConnectionsFromFile(isGuestMode, userId);
        setConnections(loadedConnections);
      } catch (e) {
        console.error('Failed to load connections:', e);
        // Fallback to localStorage for backward compatibility
        const stored = localStorage.getItem('ssh-connections');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            setConnections(data.connections || []);
          } catch (err) {
            console.error('Failed to load connections from localStorage:', err);
          }
        }
      }
    };
    loadConnections();
  }, [setConnections, isGuestMode, user?.id]);

  const favoriteConnections = connections.filter((conn) => conn.isFavorite).slice(0, 6);
  const recentConnections = connections.slice(0, 5);

  const StatBox = ({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-background-light border border-border p-4 font-mono group hover:border-primary/50 transition-all duration-300 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted uppercase tracking-widest">{label}</span>
        <Icon size={16} className={`${colorClass} opacity-70 group-hover:opacity-100 transition-opacity`} />
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-text-primary font-mono p-4 md:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-text-muted">Manage your SSH connections</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox 
          label="Total Connections" 
          value={connections.length.toString().padStart(2, '0')} 
          icon={Monitor} 
          colorClass="text-primary" 
        />
        <StatBox 
          label="Favorites" 
          value={connections.filter(c => c.isFavorite).length.toString().padStart(2, '0')} 
          icon={Hash} 
          colorClass="text-warning" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Connect / Favorites Panel */}
        <div className="lg:col-span-2 bg-background-light border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="bg-background-lighter/50 border-b border-border p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Command size={16} className="text-warning" />
              <span>QUICK_ACCESS</span>
            </div>
            <button 
              onClick={() => navigate(ROUTES.CONNECTIONS)}
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              [VIEW_ALL]
            </button>
          </div>
          
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteConnections.length > 0 ? (
              favoriteConnections.map((conn) => (
                <div
                  key={conn.id}
                  onClick={() => {
                    setSelectedConnection(conn);
                    navigate(ROUTES.CONNECTIONS);
                  }}
                  className="group relative bg-background border border-border p-4 hover:border-primary/50 transition-all cursor-pointer overflow-hidden rounded-lg hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-primary" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-background-light flex items-center justify-center border border-border rounded-md group-hover:border-primary/30">
                      <Terminal size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-text-primary group-hover:text-primary transition-colors">{conn.name}</p>
                      <p className="text-xs text-text-muted">ID: {conn.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-background-light p-2 rounded text-xs font-mono text-text-muted group-hover:text-text-secondary border border-transparent group-hover:border-border transition-colors">
                    <span className="text-success">$</span> ssh {conn.username}@{conn.host}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-text-muted border border-dashed border-border bg-background/50 rounded-lg">
                <Cpu size={32} className="mb-2 opacity-50" />
                <p className="text-sm">NO_FAVORITES_FOUND</p>
                {/* <p className="text-xs opacity-50 mt-1">Run ./add_favorite.sh to populate</p> */}
              </div>
            )}
          </div>
        </div>

        {/* Recent Log Panel */}
        <div className="bg-background-light border border-border rounded-lg overflow-hidden flex flex-col h-full shadow-sm">
          <div className="bg-background-lighter/50 border-b border-border p-3 flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Activity size={16} className="text-primary" />
              <span>CONNECTION_LOG</span>
            </div>
          </div>
          
          <div className="flex-1 p-0 overflow-y-auto">
            {recentConnections.length > 0 ? (
              <div className="divide-y divide-border">
                {recentConnections.map((conn, idx) => (
                  <div 
                    key={conn.id}
                    onClick={() => {
                      setSelectedConnection(conn);
                      navigate(ROUTES.CONNECTIONS);
                    }}
                    className="p-3 hover:bg-background-lighter transition-colors cursor-pointer flex items-center gap-3 group"
                  >
                    <span className="text-xs font-mono text-text-muted w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-text-primary font-medium group-hover:text-primary transition-colors">{conn.name}</p>
                        <span className="text-[10px] bg-background border border-border px-1 py-0.5 text-text-muted rounded">SSH</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 font-mono truncate max-w-[200px]">
                        {conn.host}:{conn.port}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-text-muted text-xs">
                <Wifi size={24} className="mb-2 opacity-20" />
                <span>LOG_EMPTY</span>
              </div>
            )}
          </div>
          
          {/* Decorative Footer for panel */}
          <div className="bg-background border-t border-border p-2 text-[10px] text-text-muted font-mono text-center">
            <span>RECENT_ACTIVITY</span>
          </div>
        </div>

      </div>
    </div>
  );
};
