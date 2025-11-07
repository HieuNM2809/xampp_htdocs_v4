// Global variables
let currentUser = null;
let backupCodes = [];
let pendingAction = null;

// DOM elements
const elements = {
    loading: document.getElementById('loading'),
    message: document.getElementById('message'),
    authForms: document.getElementById('auth-forms'),
    dashboard: document.getElementById('dashboard'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    totpGroup: document.getElementById('totp-group'),
    currentUsername: document.getElementById('current-username'),
    currentEmail: document.getElementById('current-email'),
    securityIcon: document.getElementById('security-icon'),
    securityText: document.getElementById('security-text'),
    enable2faSection: document.getElementById('enable-2fa-section'),
    manage2faSection: document.getElementById('manage-2fa-section'),
    setup2faModal: document.getElementById('setup-2fa-modal'),
    backupCodesModal: document.getElementById('backup-codes-modal'),
    confirmPasswordModal: document.getElementById('confirm-password-modal'),
    qrCode: document.getElementById('qr-code'),
    manualKey: document.getElementById('manual-key'),
    backupCodesList: document.getElementById('backup-codes-list')
};

// Utility functions
function showLoading(show = true) {
    elements.loading.classList.toggle('hidden', !show);
}

function showMessage(text, type = 'info') {
    elements.message.textContent = text;
    elements.message.className = `message ${type}`;
    elements.message.classList.remove('hidden');

    // Auto hide after 5 seconds
    setTimeout(() => {
        elements.message.classList.add('hidden');
    }, 5000);
}

function hideMessage() {
    elements.message.classList.add('hidden');
}

async function apiCall(url, options = {}) {
    try {
        showLoading(true);
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra');
        }

        return data;
    } finally {
        showLoading(false);
    }
}

// Tab functions
function showLoginForm() {
    elements.loginTab.classList.add('active');
    elements.registerTab.classList.remove('active');
    elements.loginForm.classList.remove('hidden');
    elements.registerForm.classList.add('hidden');
    elements.totpGroup.classList.add('hidden');
}

function showRegisterForm() {
    elements.registerTab.classList.add('active');
    elements.loginTab.classList.remove('active');
    elements.registerForm.classList.remove('hidden');
    elements.loginForm.classList.add('hidden');
}

// Authentication
async function handleRegister(event) {
    event.preventDefault();
    hideMessage();

    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username') || document.getElementById('register-username').value,
        email: formData.get('email') || document.getElementById('register-email').value,
        password: formData.get('password') || document.getElementById('register-password').value
    };

    try {
        const result = await apiCall('/api/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showMessage(result.message, 'success');
        showLoginForm();
        event.target.reset();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    hideMessage();

    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username') || document.getElementById('login-username').value,
        password: formData.get('password') || document.getElementById('login-password').value,
        totpCode: document.getElementById('login-totp').value
    };

    try {
        const result = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result.requires2FA) {
            // Show 2FA input field
            elements.totpGroup.classList.remove('hidden');
            showMessage(result.message, 'info');
            document.getElementById('login-totp').focus();
        } else {
            // Login successful
            currentUser = result.user;
            showDashboard();
            showMessage(result.message, 'success');
        }
    } catch (error) {
        showMessage(error.message, 'error');
        elements.totpGroup.classList.add('hidden');
    }
}

async function handleLogout() {
    try {
        await apiCall('/api/logout', { method: 'POST' });
        currentUser = null;
        showAuthForms();
        showMessage('Đã đăng xuất thành công', 'info');

        // Reset forms
        elements.loginForm.reset();
        elements.registerForm.reset();
        elements.totpGroup.classList.add('hidden');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Dashboard
function showAuthForms() {
    elements.authForms.classList.remove('hidden');
    elements.dashboard.classList.add('hidden');
    showLoginForm();
}

function showDashboard() {
    elements.authForms.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    updateUserInfo();
    updateSecurityStatus();
}

function updateUserInfo() {
    if (currentUser) {
        elements.currentUsername.textContent = currentUser.username;
        elements.currentEmail.textContent = currentUser.email;
    }
}

function updateSecurityStatus() {
    const securityStatus = document.querySelector('.security-status');

    if (currentUser && currentUser.is2FAEnabled) {
        elements.securityIcon.className = 'fas fa-shield-alt';
        elements.securityText.textContent = '2FA đã được kích hoạt';
        securityStatus.className = 'security-status enabled';
        elements.enable2faSection.classList.add('hidden');
        elements.manage2faSection.classList.remove('hidden');
    } else {
        elements.securityIcon.className = 'fas fa-exclamation-triangle';
        elements.securityText.textContent = '2FA chưa được kích hoạt';
        securityStatus.className = 'security-status disabled';
        elements.enable2faSection.classList.remove('hidden');
        elements.manage2faSection.classList.add('hidden');
    }
}

// 2FA Setup
async function setup2FA() {
    try {
        const result = await apiCall('/api/setup-2fa', { method: 'POST' });

        // Show QR code
        elements.qrCode.innerHTML = `<img src="${result.qrCode}" alt="QR Code">`;
        elements.manualKey.textContent = result.secret;

        // Show modal
        elements.setup2faModal.classList.remove('hidden');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function verify2FA() {
    const totpCode = document.getElementById('setup-totp-code').value;

    if (!totpCode || totpCode.length !== 6) {
        showMessage('Vui lòng nhập mã 6 chữ số', 'error');
        return;
    }

    try {
        const result = await apiCall('/api/enable-2fa', {
            method: 'POST',
            body: JSON.stringify({ totpCode })
        });

        // Update user status
        currentUser.is2FAEnabled = 1;

        // Show backup codes
        backupCodes = result.backupCodes;
        showBackupCodes();

        // Close setup modal
        closeModal();

        // Update UI
        updateSecurityStatus();
        showMessage(result.message, 'success');
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function showBackupCodes() {
    elements.backupCodesList.innerHTML = '';

    backupCodes.forEach(code => {
        const codeElement = document.createElement('div');
        codeElement.className = 'backup-code';
        codeElement.textContent = code;
        elements.backupCodesList.appendChild(codeElement);
    });

    elements.backupCodesModal.classList.remove('hidden');
}

// Backup codes functions
function downloadBackupCodes() {
    const content = `2FA Backup Codes\n\nLưu các mã này ở nơi an toàn. Mỗi mã chỉ sử dụng được một lần.\n\n${backupCodes.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printBackupCodes() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>2FA Backup Codes</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; }
                    .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px; }
                    .code { border: 2px solid #333; padding: 15px; text-align: center; font-size: 1.2rem; font-weight: bold; }
                    .note { margin-top: 30px; padding: 15px; background: #f0f0f0; border-left: 4px solid #333; }
                </style>
            </head>
            <body>
                <h1>2FA Backup Codes</h1>
                <div class="codes">
                    ${backupCodes.map(code => `<div class="code">${code}</div>`).join('')}
                </div>
                <div class="note">
                    <strong>Quan trọng:</strong> Lưu trữ các mã này ở nơi an toàn. Mỗi mã chỉ sử dụng được một lần.
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function copyBackupCodes() {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Đã sao chép backup codes', 'success');
    }).catch(() => {
        showMessage('Không thể sao chép', 'error');
    });
}

function copySecret() {
    const secret = elements.manualKey.textContent;
    navigator.clipboard.writeText(secret).then(() => {
        showMessage('Đã sao chép secret key', 'success');
    }).catch(() => {
        showMessage('Không thể sao chép', 'error');
    });
}

// Password confirmation modal
function showPasswordConfirmation(action) {
    pendingAction = action;
    document.getElementById('confirm-password').value = '';
    elements.confirmPasswordModal.classList.remove('hidden');
}

async function confirmPassword() {
    const password = document.getElementById('confirm-password').value;

    if (!password) {
        showMessage('Vui lòng nhập password', 'error');
        return;
    }

    try {
        if (pendingAction === 'disable-2fa') {
            await disable2FA(password);
        } else if (pendingAction === 'regenerate-codes') {
            await regenerateBackupCodes(password);
        }

        closeModal();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function disable2FA(password) {
    const result = await apiCall('/api/disable-2fa', {
        method: 'POST',
        body: JSON.stringify({ password })
    });

    // Update user status
    currentUser.is2FAEnabled = 0;

    // Update UI
    updateSecurityStatus();
    showMessage(result.message, 'success');
}

async function regenerateBackupCodes(password) {
    const result = await apiCall('/api/regenerate-backup-codes', {
        method: 'POST',
        body: JSON.stringify({ password })
    });

    // Show new backup codes
    backupCodes = result.backupCodes;
    showBackupCodes();

    showMessage(result.message, 'success');
}

// Modal functions
function closeModal() {
    elements.setup2faModal.classList.add('hidden');
    elements.backupCodesModal.classList.add('hidden');
    elements.confirmPasswordModal.classList.add('hidden');
    pendingAction = null;
}

// Initialize app
async function init() {
    try {
        // Check if user is already logged in
        const result = await apiCall('/api/me');
        currentUser = result.user;
        showDashboard();
    } catch (error) {
        // User not logged in
        showAuthForms();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

// Form submissions
elements.registerForm.addEventListener('submit', handleRegister);
elements.loginForm.addEventListener('submit', handleLogin);

// Button clicks
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('setup-2fa-btn').addEventListener('click', setup2FA);
document.getElementById('verify-2fa-btn').addEventListener('click', verify2FA);
document.getElementById('disable-2fa-btn').addEventListener('click', () => {
    showPasswordConfirmation('disable-2fa');
});
document.getElementById('regenerate-codes-btn').addEventListener('click', () => {
    showPasswordConfirmation('regenerate-codes');
});
document.getElementById('confirm-password-btn').addEventListener('click', confirmPassword);

// Modal close events
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeModal);
});

// Close modal when clicking outside
[elements.setup2faModal, elements.backupCodesModal, elements.confirmPasswordModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// TOTP code input formatting
document.getElementById('setup-totp-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
});

document.getElementById('login-totp').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').substring(0, 8);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Close modal with Escape key
    if (e.key === 'Escape') {
        closeModal();
    }

    // Submit confirm password with Enter key
    if (e.key === 'Enter' && !elements.confirmPasswordModal.classList.contains('hidden')) {
        const confirmPasswordInput = document.getElementById('confirm-password');
        if (document.activeElement === confirmPasswordInput) {
            confirmPassword();
        }
    }
});

// Auto-focus on TOTP input when it becomes visible
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const totpInput = document.getElementById('login-totp');
            if (!elements.totpGroup.classList.contains('hidden') && totpInput) {
                setTimeout(() => totpInput.focus(), 100);
            }
        }
    });
});

observer.observe(elements.totpGroup, { attributes: true });

console.log('🚀 2FA Demo App loaded successfully!');
console.log('📱 Supported authenticator apps: Google Authenticator, Authy, Microsoft Authenticator, etc.');
