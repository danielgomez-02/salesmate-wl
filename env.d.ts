/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RETOOL_ROUTES_API_KEY: string;
  readonly VITE_RETOOL_UPDATE_API_KEY: string;
  readonly VITE_RETOOL_ROUTES_URL: string;
  readonly VITE_RETOOL_UPDATE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
