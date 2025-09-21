import React from 'react';
import StaggeredMenu from './StaggeredMenu.js';

const MobileMenuApp = () => {
  // MindMate menu items
  const menuItems = [
    { label: 'Home', ariaLabel: 'Go to home page', section: 'hero' },
    { label: 'Assessment', ariaLabel: 'Take an assessment', section: 'quiz-section' },
    { label: 'AI Mentor', ariaLabel: 'Access AI mentor', section: 'chat-section' },
    { label: 'Learning', ariaLabel: 'Start learning', section: 'learning-section' },
    { label: 'Community', ariaLabel: 'Join the community', section: 'community-section' }
  ];

  // Social items
  const socialItems = [
    { label: 'Twitter', link: 'https://x.com/Sameermistri' },
    { label: 'Instagram', link: 'https://www.instagram.com/sameermistrii/' },
    { label: 'LinkedIn', link: 'https://www.linkedin.com/in/sameermistri/' }
  ];

  return (
    React.createElement(StaggeredMenu, {
      position: "right",
      items: menuItems,
      socialItems: socialItems,
      displaySocials: true,
      displayItemNumbering: false,
      menuButtonColor: "#fff",
      openMenuButtonColor: "#1ff9e0",
      changeMenuColorOnOpen: true,
      colors: ['#1ff9e0', '#25F4DF'],
      accentColor: "#1ff9e0",
      onMenuOpen: () => console.log('📱 MindMate Staggered Menu opened'),
      onMenuClose: () => console.log('📱 MindMate Staggered Menu closed')
    })
  );
};

export default MobileMenuApp;
