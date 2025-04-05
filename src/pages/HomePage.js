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

  return React.createElement(
    'div',
    { className: 'homepage' },
    React.createElement(
      'header',
      { className: 'header' },
      React.createElement('h1', null, 'Social Reading App'),
      React.createElement(
        'nav',
        { className: 'nav' },
        React.createElement('a', { href: '#' }, 'Home'),
        React.createElement('a', { href: '#' }, 'Features'),
        React.createElement('a', { href: '#' }, 'About'),
        React.createElement('a', { href: '#' }, 'Contact')
      )
    ),
    React.createElement(
      'div',
      { className: 'hero' },
      React.createElement('h2', null, 'Transform Your Reading Experience'),
      React.createElement(
        'p',
        null,
        'Connect with the right books and the right people at the right time.'
      ),
      React.createElement(
        'div',
        { className: 'auth-buttons' },
        React.createElement(
          'button',
          { onClick: () => navigateTo('login') },
          'Login'
        ),
        React.createElement(
          'button',
          { onClick: () => navigateTo('signup') },
          'Sign Up'
        )
      )
    ),
    React.createElement(
      'section',
      { className: 'features' },
      React.createElement(
        'div',
        { className: 'feature' },
        React.createElement('h3', null, 'Personalized Recommendations'),
        React.createElement(
          'p',
          null,
          'Get book suggestions based on your preferences, mood, and purpose.'
        )
      ),
      React.createElement(
        'div',
        { className: 'feature' },
        React.createElement('h3', null, 'Social Reading'),
        React.createElement(
          'p',
          null,
          'Comment and react to specific parts of books with your friends.'
        )
      ),
      React.createElement(
        'div',
        { className: 'feature' },
        React.createElement('h3', null, 'Friend Circles'),
        React.createElement(
          'p',
          null,
          'Connect with friends and see their reading progress.'
        )
      ),
      React.createElement(
        'div',
        { className: 'feature' },
        React.createElement('h3', null, 'Achievements'),
        React.createElement(
          'p',
          null,
          'Earn badges for milestones like reading new genres or completing books.'
        )
      )
    ),
    React.createElement(
      'footer',
      { className: 'footer' },
      React.createElement(
        'p',
        null,
        '\u00A9 2023 Social Reading App. All rights reserved.'
      )
    )
  );
};

export default HomePage;
