import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Initialize color theme before React renders
import '@/hooks/useColorTheme';
// Install global 401/403 → logout interceptor before any fetch fires.
import { installAuthInterceptor } from '@/lib/authInterceptor';

installAuthInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
