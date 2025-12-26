import React from 'react';
import { MasterPasswordSetup } from '../components/auth/MasterPasswordSetup';
import { WindowControls } from '../components/layout/WindowControls';

export const SetupPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-2 no-drag">
        <WindowControls />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <MasterPasswordSetup />
      </div>
    </div>
  );
};

