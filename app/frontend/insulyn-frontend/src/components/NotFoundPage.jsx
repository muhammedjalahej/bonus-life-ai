import React from 'react';

const NotFoundPage = () => (
  <div className="not-found-container">
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist or has been moved.</p>
    <a href="/" className="home-link">Return to Home</a>
    <style>{`
      .not-found-container {
        text-align: center; 
        padding: 50px 20px;
        max-width: 600px;
        margin: 0 auto;
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      .not-found-container h1 { 
        color: #1976d2; 
        margin-bottom: 20px; 
      }
      .not-found-container p { 
        font-size: 18px; 
        margin-bottom: 30px; 
        color: #666; 
      }
      .home-link {
        display: inline-block;
        padding: 12px 30px;
        background-color: #1976d2;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        transition: background-color 0.3s;
      }
      .home-link:hover {
        background-color: #1565c0;
      }
    `}</style>
  </div>
);

export default NotFoundPage;
