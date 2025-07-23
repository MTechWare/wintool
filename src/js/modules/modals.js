
export function initModals() {
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });

    
    const closeButtons = document.querySelectorAll('.modal .close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}


export function closeModal(modalId) {
    console.log('Attempting to close modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        console.log('Modal found, closing...');
        modal.style.display = 'none';
        console.log('Modal closed successfully');
    } else {
        console.error('Modal not found:', modalId);
    }
}



export async function showSystemInfo() {
    const modal = document.getElementById('system-info-modal');
    const content = document.getElementById('system-info-content');

    if (modal && content) {
        
        content.innerHTML = '<p>Loading system information...</p>';
        modal.style.display = 'flex';

        try {
            
            if (window.electronAPI) {
                const systemInfo = await window.electronAPI.getSystemInfo();

                
                content.innerHTML = `
                    <div class="system-info-grid">
                        <div class="system-info-item">
                            <h4>Platform</h4>
                            <p>${systemInfo.platform}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Architecture</h4>
                            <p>${systemInfo.arch}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Hostname</h4>
                            <p>${systemInfo.hostname}</p>
                        </div>

                        <div class="system-info-item">
                            <h4>CPU Cores</h4>
                            <p>${systemInfo.cpus}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Uptime</h4>
                            <p>${systemInfo.uptime}</p>
                        </div>
                    </div>
                `;
            } else {
                content.innerHTML = '<p>System information not available (running in browser)</p>';
            }
        } catch (error) {
            console.error('Error getting system info:', error);
            content.innerHTML = '<p>Error loading system information</p>';
        }
    }
}
