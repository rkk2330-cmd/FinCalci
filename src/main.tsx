// FinCalci — Entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Native CSS splash stays visible until App signals ready.
// App.tsx Splash component removes #native-splash when it transitions.
// index.html has 8s safety timeout as fallback.

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
