// Mobile keyboard toolbar functionality
(function() {
  // Only run on mobile devices
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return;
  }

  const toolbar = document.getElementById('mobile-keyboard-toolbar');
  const textarea = document.getElementById('texter');
  let ctrlPressed = false;

  // Handle keyboard button clicks
  toolbar.addEventListener('click', function(e) {
    const button = e.target.closest('.kb-key');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const key = button.getAttribute('data-key');
    const special = button.getAttribute('data-special');

    // Handle Ctrl toggle
    if (key === 'Control') {
      ctrlPressed = !ctrlPressed;
      button.classList.toggle('active', ctrlPressed);

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      return;
    }

    // Handle special commands
    if (special === 'clear') {
      // Trigger Ctrl+L (clear screen)
      const event = new KeyboardEvent('keyup', {
        key: 'l',
        keyCode: 76,
        which: 76,
        ctrlKey: true,
        bubbles: true
      });
      window.dispatchEvent(event);

      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
      return;
    }

    // Create keyboard event
    let eventOptions = {
      bubbles: true,
      cancelable: true
    };

    // Map key to keyCode
    const keyCodes = {
      'Tab': 9,
      'Escape': 27,
      'ArrowUp': 38,
      'ArrowDown': 40,
      'ArrowLeft': 37,
      'ArrowRight': 39
    };

    if (key) {
      eventOptions.key = key;
      eventOptions.keyCode = keyCodes[key];
      eventOptions.which = keyCodes[key];
      eventOptions.code = key;

      // Add ctrl modifier if active
      if (ctrlPressed) {
        eventOptions.ctrlKey = true;
      }

      // Dispatch both keydown and keyup events
      const keydownEvent = new KeyboardEvent('keydown', eventOptions);
      const keyupEvent = new KeyboardEvent('keyup', eventOptions);

      textarea.dispatchEvent(keydownEvent);
      window.dispatchEvent(keydownEvent);

      setTimeout(() => {
        textarea.dispatchEvent(keyupEvent);
        window.dispatchEvent(keyupEvent);
      }, 50);

      // Reset Ctrl after use
      if (ctrlPressed && key !== 'Control') {
        ctrlPressed = false;
        document.querySelector('.kb-ctrl').classList.remove('active');
      }

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Visual feedback
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = '';
      }, 100);
    }

    // Keep focus on textarea
    textarea.focus();
  });

  // Keep toolbar always at bottom
  // No dynamic positioning needed - CSS handles it with fixed position

  // Reset ctrl state when textarea loses focus
  textarea.addEventListener('blur', function() {
    if (ctrlPressed) {
      ctrlPressed = false;
      document.querySelector('.kb-ctrl').classList.remove('active');
    }
  });

  console.log('%c[Mobile Keyboard] iSH-style keyboard toolbar loaded', 'color: #00ff41; font-weight: bold;');
})();
