/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMeta {
  env: {
    BASE_URL: string;
    MODE: string;
    DEV: boolean;
    PROD: boolean;
    SSR: boolean;
    [key: string]: any;
  };
} 