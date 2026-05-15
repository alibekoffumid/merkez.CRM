import React, { useRef, useEffect } from 'react';

const TelegramLoginButton = ({ botName, onAuth, buttonSize = 'large', cornerRadius = 20 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Add global callback for the Telegram widget
    window.onTelegramAuth = (user) => {
      onAuth(user);
    };

    // Create the script tag
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    
    // Append to container
    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      delete window.onTelegramAuth;
    };
  }, [botName, buttonSize, cornerRadius, onAuth]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center transition-all hover:scale-[1.02] active:scale-[0.98]" 
    />
  );
};

export default TelegramLoginButton;
