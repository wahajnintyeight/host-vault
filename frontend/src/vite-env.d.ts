/// <reference types="vite/client" />

declare global {
  interface Window {
    go: {
      main: {
        App: any;
      };
    };
  }
}

export {};
