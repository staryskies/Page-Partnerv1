import React from 'react';
import './HomePage.css';

const HomePage = () => {
  const navigateTo = (page) => {
    if (page === 'login') {
      window.location.href = '/login';
    } else if (page === 'signup') {
      window.location.href = '/signup';
    }
  };

  return (
    <div className="homepage">
      <header className="header">
        <h1>Social Reading App</h1>
        <nav className="nav">
          <a href="#">Home</a>
          <a href="#">Features</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
        </nav>
      </header>

      <div className="hero">
        <h2>Transform Your Reading Experience</h2>
        <p>Connect with the right books and the right people at the right time.</p>
        <div className="auth-buttons">
          <button onClick={() => navigateTo('login')}>Login</button>
          <button onClick={() => navigateTo('signup')}>Sign Up</button>
        </div>
      </div>

      <section className="features">
        <div className="feature">
          <h3>Personalized Recommendations</h3>
          <p>Get book suggestions based on your preferences, mood, and purpose.</p>
        </div>
        <div className="feature">
          <h3>Social Reading</h3>
          <p>Comment and react to specific parts of books with your friends.</p>
        </div>
        <div className="feature">
          <h3>Friend Circles</h3>
          <p>Connect with friends and see their reading progress.</p>
        </div>
        <div className="feature">
          <h3>Achievements</h3>
          <p>Earn badges for milestones like reading new genres or completing books.</p>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2023 Social Reading App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
