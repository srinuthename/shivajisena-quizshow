/// <reference types="vite/client" />

interface Window {
  gtag?: (...args: any[]) => void;
}

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_HOST_PRODUCT_KEY?: string;
  readonly VITE_ORCHESTRATOR_APP_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
