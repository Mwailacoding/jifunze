import { useCallback } from 'react';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  duration?: number;
}

export const useConfetti = () => {
  const showConfetti = useCallback((options: ConfettiOptions = {}) => {
    const {
      particleCount = 50,
      spread = 70,
      colors = ['#FFD700', '#2E8B57', '#4682B4', '#FF6B6B', '#4ECDC4'],
      duration = 3000
    } = options;

    // Create confetti container
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.zIndex = '9999';
    document.body.appendChild(confettiContainer);

    // Generate confetti particles
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 0.3 + 's';
      particle.style.animationDuration = (Math.random() * 0.8 + 0.5) + 's';
      confettiContainer.appendChild(particle);
    }

    // Remove confetti after duration
    setTimeout(() => {
      if (confettiContainer.parentNode) {
        confettiContainer.parentNode.removeChild(confettiContainer);
      }
    }, duration);
  }, []);

  return { showConfetti };
};