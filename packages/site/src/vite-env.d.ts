/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_PASSWORD_HASH?: string;
  readonly VITE_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
