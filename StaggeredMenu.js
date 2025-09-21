import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

export const StaggeredMenu = ({
  position = 'right',
  colors = ['#1ff9e0', '#25F4DF'],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = false,
  className,
  menuButtonColor = '#fff',
  openMenuButtonColor = '#1ff9e0',
  accentColor = '#1ff9e0',
  changeMenuColorOnOpen = true,
  onMenuOpen,
  onMenuClose
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef(null);
  const toggleBtnRef = useRef(null);

  const handleMenuClick = (item) => {
    if (window.showSection) {
      window.showSection(item.section);
    }
    setOpen(false);
    onMenuClose?.();
  };

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
    } else {
      onMenuClose?.();
    }
  }, [onMenuOpen, onMenuClose]);

  return React.createElement('div', {
    className: (className ? className + ' ' : '') + 'staggered-menu-wrapper',
    style: accentColor ? { ['--sm-accent']: accentColor } : undefined,
    'data-position': position,
    'data-open': open || undefined
  }, [
    React.createElement('header', {
      key: 'header',
      className: 'staggered-menu-header',
      'aria-label': 'Main navigation header'
    }, [
      React.createElement('div', {
        key: 'logo',
        className: 'sm-logo',
        'aria-label': 'Logo'
      }, [
        React.createElement('span', {
          key: 'icon',
          className: 'sm-logo-icon'
        }, '🧠'),
        React.createElement('span', {
          key: 'text',
          className: 'sm-logo-text'
        }, 'MindMate')
      ]),
      React.createElement('button', {
        key: 'toggle',
        ref: toggleBtnRef,
        className: 'sm-toggle',
        'aria-label': open ? 'Close menu' : 'Open menu',
        'aria-expanded': open,
        'aria-controls': 'staggered-menu-panel',
        onClick: toggleMenu,
        type: 'button'
      }, [
        React.createElement('span', {
          key: 'text',
          className: 'sm-toggle-textWrap',
          'aria-hidden': true
        }, [
          React.createElement('span', {
            key: 'inner',
            className: 'sm-toggle-textInner'
          }, open ? '✕' : '☰')
        ])
      ])
    ]),
    React.createElement('aside', {
      key: 'panel',
      id: 'staggered-menu-panel',
      ref: panelRef,
      className: 'staggered-menu-panel compact-menu',
      'aria-hidden': !open,
      'data-open': open
    }, [
      React.createElement('div', {
        key: 'inner',
        className: 'sm-panel-inner'
      }, [
        React.createElement('ul', {
          key: 'list',
          className: 'sm-panel-list',
          role: 'list',
          'data-numbering': displayItemNumbering || undefined
        }, items && items.length ? items.map((it, idx) => 
          React.createElement('li', {
            key: it.label + idx,
            className: 'sm-panel-itemWrap'
          }, [
            React.createElement('a', {
              key: 'link',
              className: 'sm-panel-item',
              href: '#',
              'aria-label': it.ariaLabel,
              'data-index': idx + 1,
              onClick: (e) => {
                e.preventDefault();
                handleMenuClick(it);
              }
            }, [
              React.createElement('span', {
                key: 'label',
                className: 'sm-panel-itemLabel'
              }, it.label)
            ])
          ])
        ) : [
          React.createElement('li', {
            key: 'no-items',
            className: 'sm-panel-itemWrap',
            'aria-hidden': true
          }, [
            React.createElement('span', {
              key: 'item',
              className: 'sm-panel-item'
            }, [
              React.createElement('span', {
                key: 'label',
                className: 'sm-panel-itemLabel'
              }, 'No items')
            ])
          ])
        ]),
        displaySocials && socialItems && socialItems.length > 0 ? React.createElement('div', {
          key: 'socials',
          className: 'sm-socials',
          'aria-label': 'Social links'
        }, [
          React.createElement('h3', {
            key: 'title',
            className: 'sm-socials-title'
          }, 'Socials'),
          React.createElement('ul', {
            key: 'list',
            className: 'sm-socials-list',
            role: 'list'
          }, socialItems.map((s, i) => 
            React.createElement('li', {
              key: s.label + i,
              className: 'sm-socials-item'
            }, [
              React.createElement('a', {
                key: 'link',
                href: s.link,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'sm-socials-link'
              }, s.label)
            ])
          ))
        ]) : null
      ])
    ])
  ]);
};

export default StaggeredMenu;
