/**
 * Display a notification message to the user with specified type and styling.
 * Creates a notification container if it doesn't exist and shows a styled notification.
 *
 * @param {string} message - The message to display in the notification
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error', 'warning')
 * @returns {void}
 */
export function showNotification(message, type = 'info') {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = 'notification';

    let icon = 'fas fa-info-circle';
    let bgColor = 'var(--primary-color)';

    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            bgColor = '#10b981';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            bgColor = '#ef4444';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            bgColor = '#f59e0b';
            break;
        default:
            icon = 'fas fa-info-circle';
            bgColor = 'var(--primary-color)';
    }

    notification.style.cssText = `
        background: ${bgColor};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        max-width: 350px;
        pointer-events: auto;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;

    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}
