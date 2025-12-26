import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { WindowControls } from '../components/layout/WindowControls';
import { Home, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../lib/constants';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-2 no-drag">
        <WindowControls />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-text-secondary mb-2">Page Not Found</h2>
          <p className="text-text-muted mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              leftIcon={<ArrowLeft size={16} />}
            >
              Go Back
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              leftIcon={<Home size={16} />}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

