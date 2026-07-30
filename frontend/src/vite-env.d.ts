/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the app_ef backend (qh-over-EfService). In production
   *  tw_platform's deploy injects `/api/app_ef`; unset → the local dev default. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
