// main.jsx: app entry point.
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyTheme, savedTheme } from './lib';
applyTheme(savedTheme()); // apply the saved theme before the first paint so there's no flash
createRoot(document.getElementById('root')).render(<App />);
