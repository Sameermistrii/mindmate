# Staggered Menu Component

A beautiful animated staggered menu component for React with smooth GSAP animations.

## Features

- 🎨 Beautiful staggered animations
- 📱 Responsive design
- ♿ Accessibility features
- 🎯 Customizable colors and styling
- 🔄 Smooth open/close transitions
- 📊 Item numbering support
- 🔗 Social links section
- 🎭 Multiple position options

## Installation

Choose your preferred package manager:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Usage

```jsx
import StaggeredMenu from './StaggeredMenu';

const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'About', ariaLabel: 'Learn about us', link: '/about' },
  { label: 'Services', ariaLabel: 'View our services', link: '/services' },
  { label: 'Contact', ariaLabel: 'Get in touch', link: '/contact' }
];

const socialItems = [
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' }
];

function App() {
  return (
    <div style={{ height: '100vh', background: '#1a1a1a' }}>
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
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
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'left' \| 'right'` | `'right'` | Position of the menu panel |
| `colors` | `string[]` | `['#B19EEF', '#5227FF']` | Array of colors for the prelayers |
| `items` | `MenuItem[]` | `[]` | Array of menu items |
| `socialItems` | `SocialItem[]` | `[]` | Array of social links |
| `displaySocials` | `boolean` | `true` | Whether to show social links |
| `displayItemNumbering` | `boolean` | `true` | Whether to show item numbers |
| `className` | `string` | `undefined` | Additional CSS class |
| `logoUrl` | `string` | `'/src/assets/logos/reactbits-gh-white.svg'` | URL to the logo image |
| `menuButtonColor` | `string` | `'#fff'` | Color of the menu button |
| `openMenuButtonColor` | `string` | `'#fff'` | Color of the menu button when open |
| `accentColor` | `string` | `'#5227FF'` | Accent color for highlights |
| `changeMenuColorOnOpen` | `boolean` | `true` | Whether to change button color on open |
| `onMenuOpen` | `() => void` | `undefined` | Callback when menu opens |
| `onMenuClose` | `() => void` | `undefined` | Callback when menu closes |

## Types

```typescript
interface MenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}

interface SocialItem {
  label: string;
  link: string;
}
```

## Development

To start the development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

## Dependencies

- React 18+
- GSAP 3.12+
- Vite (for development)

## License

MIT
