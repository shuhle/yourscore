/**
 * Toast Notification Component
 */

function showToast(message, type = 'success', duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');

  container.appendChild(toast);

  const removeToast = () => {
    toast.classList.add('toast-out');
    toast.addEventListener(
      'animationend',
      () => {
        toast.remove();
      },
      { once: true }
    );
  };

  setTimeout(removeToast, duration);
}

export { showToast };
