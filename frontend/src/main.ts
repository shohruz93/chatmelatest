import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Ensure application uses dark theme by default when no preference is stored
try {
  const stored = localStorage.getItem('theme');
  if (!stored) {
    localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (stored === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
} catch (e) {
  // localStorage may be unavailable in some environments; ignore safely
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
