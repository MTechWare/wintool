/**
 * Enhanced notification system with improved design and functionality.
 * Creates a notification container if it doesn't exist and shows a styled notification.
 *
 * @param {string} message - The message to display in the notification
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error', 'warning')
 * @param {number} [duration] - Duration in milliseconds (optional, uses default based on type)
 * @returns {HTMLElement} The notification element
 */
export function showNotification(message, type = 'info', duration = null) {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Set icon based on type
    const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };

    const icon = iconMap[type] || 'info-circle';

    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to container
    container.appendChild(notification);

    // Set auto-remove timeout based on type or custom duration
    const timeout = duration || (type === 'error' ? 10000 : type === 'warning' ? 7000 : 5000);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, timeout);

    return notification;
}

/**
 * Show a success notification
 * @param {string} message - The success message to display
 * @param {number} [duration] - Duration in milliseconds
 * @returns {HTMLElement} The notification element
 */
export function showSuccess(message, duration = null) {
    return showNotification(message, 'success', duration);
}

/**
 * Show an error notification
 * @param {string} message - The error message to display
 * @param {number} [duration] - Duration in milliseconds
 * @returns {HTMLElement} The notification element
 */
export function showError(message, duration = null) {
    return showNotification(message, 'error', duration);
}

/**
 * Show a warning notification
 * @param {string} message - The warning message to display
 * @param {number} [duration] - Duration in milliseconds
 * @returns {HTMLElement} The notification element
 */
export function showWarning(message, duration = null) {
    return showNotification(message, 'warning', duration);
}

/**
 * Show an info notification
 * @param {string} message - The info message to display
 * @param {number} [duration] - Duration in milliseconds
 * @returns {HTMLElement} The notification element
 */
export function showInfo(message, duration = null) {
    return showNotification(message, 'info', duration);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
    const container = document.querySelector('.notification-container');
    if (container) {
        const notifications = container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        });
    }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use showNotification, showSuccess, showError, showWarning, or showInfo instead
 */
export function displayNotification(message, type = 'info') {
    console.warn('displayNotification is deprecated. Use showNotification instead.');
    return showNotification(message, type);
}
