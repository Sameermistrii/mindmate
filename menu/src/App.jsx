import React from 'react';
import StaggeredMenu from './StaggeredMenu';

const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'Assessment', ariaLabel: 'Take an assessment', link: '/assessment' },
  { label: 'AI Mentor', ariaLabel: 'Access AI mentor', link: '/ai-mentor' },
  { label: 'Learning', ariaLabel: 'Start learning', link: '/learning' },
  { label: 'Community', ariaLabel: 'Join the community', link: '/community' }
];

const socialItems = [
  { label: 'Twitter', link: 'https://x.com/Sameermistri' },
  { label: 'Instagram', link: 'https://www.instagram.com/sameermistrii/' },
  { label: 'LinkedIn', link: 'https://www.linkedin.com/in/sameermistri/' }
];

function App() {
  return (
    <div style={{ height: '100vh', background: 'transparent' }}>
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={false}
        menuButtonColor="#fff"
        openMenuButtonColor="#fff"
        changeMenuColorOnOpen={true}
        colors={['#B19EEF', '#5227FF']}
        logoUrl="/path-to-your-logo.svg"
        accentColor="#ff6b6b"
        onMenuOpen={() => console.log('Menu opened')}
        onMenuClose={() => console.log('Menu closed')}
      />
    </div>
  );
}

export default App;
