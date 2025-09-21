// Integration script to load the React Staggered Menu for mobile devices
document.addEventListener('DOMContentLoaded', function() {
    // Only load menu on mobile devices
    if (window.innerWidth <= 768) {
        // Create script element to load React and the menu
        const script = document.createElement('script');
        script.type = 'module';
        script.src = './menu/src/main.jsx';
        document.head.appendChild(script);
        
        // Add React and ReactDOM if not already loaded
        if (!window.React) {
            const reactScript = document.createElement('script');
            reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
            document.head.appendChild(reactScript);
            
            const reactDOMScript = document.createElement('script');
            reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
            document.head.appendChild(reactDOMScript);
        }
    }
});