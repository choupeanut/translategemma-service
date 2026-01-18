import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log("Minimal main.tsx is running");

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}