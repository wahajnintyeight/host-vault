import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { WindowControls } from '../components/layout/WindowControls';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-2 no-drag">
        <WindowControls />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    </div>
  );
};

