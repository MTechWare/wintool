/**
 * Test script for backup schedule dialog
 */

// Create a test dialog
function createTestDialog() {
    console.log('Creating test dialog');

    // Check if dialog already exists
    const existingDialog = document.getElementById('test-dialog');
    if (existingDialog) {
        console.log('Test dialog already exists, returning existing dialog');
        return existingDialog;
    }

    // Create dialog HTML
    const dialogHTML = `
    <div id="test-dialog" class="dialog-container" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); z-index: 9999; align-items: center; justify-content: center; overflow: auto; padding: 20px;">
        <div class="dialog" style="background-color: #1e1e24; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); width: 550px; max-width: 90%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #2e2e36; animation: slideIn 0.3s ease-out;">
            <div class="dialog-header" style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background-color: #27272f; border-bottom: 1px solid #2e2e36;">
                <h2 style="font-size: 1.2rem; font-weight: 600; color: #f0f0f0; margin: 0; display: flex; align-items: center;"><i class="fas fa-calendar-alt" style="margin-right: 10px; color: var(--primary, #ff9800);"></i> Test Dialog</h2>
                <button class="dialog-close-btn" style="background: none; border: none; color: #a0a0a0; font-size: 1.2rem; cursor: pointer; padding: 5px;"><i class="fas fa-times"></i></button>
            </div>
            <div class="dialog-content" style="padding: 20px; overflow-y: auto; max-height: calc(90vh - 130px);">
                <p style="color: #e0e0e0; margin-bottom: 20px;">This is a test dialog to verify that dialogs are working correctly.</p>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="test-input" style="display: block; font-weight: 500; color: #e0e0e0; margin-bottom: 5px;">Test Input</label>
                    <input type="text" id="test-input" class="form-control" placeholder="Enter some text" style="width: 100%; padding: 8px 12px; background-color: #27272f; border: 1px solid #3e3e46; border-radius: 4px; color: #e0e0e0;">
                </div>
            </div>
            <div class="dialog-footer" style="display: flex; justify-content: flex-end; padding: 15px 20px; background-color: #27272f; border-top: 1px solid #2e2e36; gap: 10px;">
                <button class="btn btn-secondary dialog-cancel-btn" style="padding: 8px 16px; background-color: #23232a; color: #fff; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button class="btn btn-primary" id="test-ok-btn" style="padding: 8px 16px; background-color: var(--primary, #ff9800); color: #fff; border: none; border-radius: 4px; cursor: pointer;">OK</button>
            </div>
        </div>
    </div>
    `;

    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = dialogHTML;

    // Append dialog to body
    while (tempContainer.firstChild) {
        document.body.appendChild(tempContainer.firstChild);
    }

    // Get dialog element
    const dialog = document.getElementById('test-dialog');

    if (!dialog) {
        console.error('Failed to create test dialog');
        return null;
    }

    console.log('Test dialog created successfully');

    // Set up event listeners
    document.querySelectorAll('#test-dialog .dialog-close-btn, #test-dialog .dialog-cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            console.log('Close/Cancel button clicked');
            hideDialog(dialog);
        });
    });

    const okBtn = document.getElementById('test-ok-btn');
    if (okBtn) {
        okBtn.addEventListener('click', function() {
            console.log('OK button clicked');
            const input = document.getElementById('test-input');
            alert(`You entered: ${input.value || 'nothing'}`);
            hideDialog(dialog);
        });
    }

    return dialog;
}

// Show dialog
function showDialog(dialog) {
    if (!dialog) return;
    dialog.style.display = 'flex';
}

// Hide dialog
function hideDialog(dialog) {
    if (!dialog) return;
    dialog.style.display = 'none';
}

// Create and show test dialog
function showTestDialog() {
    console.log('Showing test dialog');
    const dialog = document.getElementById('test-dialog') || createTestDialog();
    showDialog(dialog);
}

// Export the function
window.showTestDialog = showTestDialog;
