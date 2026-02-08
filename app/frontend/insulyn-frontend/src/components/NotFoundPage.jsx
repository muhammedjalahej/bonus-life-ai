import React from 'react';
import { Home, SearchX } from 'lucide-react';

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
    <div className="text-8xl font-black gradient-text mb-4">404</div>
    <p className="text-gray-500 text-lg mb-8">This page doesn't exist or has been moved.</p>
    <a href="/" className="btn-primary"><Home className="w-4 h-4" /> Go Home</a>
  </div>
);

export default NotFoundPage;
