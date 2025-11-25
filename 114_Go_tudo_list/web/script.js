// API Base URL
const API_BASE = 'http://localhost:8080/api/v1';

// Global state
let todos = [];
let currentFilter = 'all';

// DOM Elements
const addTodoForm = document.getElementById('addTodoForm');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const editModal = document.getElementById('editModal');
const editTodoForm = document.getElementById('editTodoForm');

// Filter buttons
const filterButtons = document.querySelectorAll('.filter-btn');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadTodos();
});

// Setup event listeners
function setupEventListeners() {
    // Add todo form
    addTodoForm.addEventListener('submit', handleAddTodo);
    
    // Edit todo form
    editTodoForm.addEventListener('submit', handleEditTodo);
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });
    
    // Modal close on outside click
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && editModal.style.display === 'block') {
            closeEditModal();
        }
    });
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function fetchTodos(filter = null) {
    const endpoint = filter ? `/todos?status=${filter}` : '/todos';
    return await apiRequest(endpoint);
}

async function createTodo(todoData) {
    return await apiRequest('/todos', {
        method: 'POST',
        body: JSON.stringify(todoData)
    });
}

async function updateTodo(id, todoData) {
    return await apiRequest(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(todoData)
    });
}

async function deleteTodo(id) {
    return await apiRequest(`/todos/${id}`, {
        method: 'DELETE'
    });
}

async function toggleTodo(id) {
    return await apiRequest(`/todos/${id}/toggle`, {
        method: 'PATCH'
    });
}

// Event Handlers
async function handleAddTodo(e) {
    e.preventDefault();
    
    const title = document.getElementById('todoTitle').value.trim();
    const description = document.getElementById('todoDescription').value.trim();
    const priority = document.getElementById('todoPriority').value;
    const dueDateInput = document.getElementById('todoDueDate').value;
    
    if (!title) {
        showToast('Vui lòng nhập tiêu đề công việc', 'error');
        return;
    }
    
    const todoData = {
        title,
        description,
        priority,
        due_date: dueDateInput ? new Date(dueDateInput).toISOString() : null
    };
    
    try {
        const result = await createTodo(todoData);
        showToast('Thêm công việc thành công!', 'success');
        
        // Reset form
        addTodoForm.reset();
        
        // Reload todos
        await loadTodos();
    } catch (error) {
        showToast(`Lỗi: ${error.message}`, 'error');
    }
}

async function handleEditTodo(e) {
    e.preventDefault();
    
    const id = document.getElementById('editTodoId').value;
    const title = document.getElementById('editTodoTitle').value.trim();
    const description = document.getElementById('editTodoDescription').value.trim();
    const priority = document.getElementById('editTodoPriority').value;
    const completed = document.getElementById('editTodoCompleted').checked;
    const dueDateInput = document.getElementById('editTodoDueDate').value;
    
    if (!title) {
        showToast('Vui lòng nhập tiêu đề công việc', 'error');
        return;
    }
    
    const todoData = {
        title,
        description,
        priority,
        completed,
        due_date: dueDateInput ? new Date(dueDateInput).toISOString() : null
    };
    
    try {
        await updateTodo(id, todoData);
        showToast('Cập nhật công việc thành công!', 'success');
        closeEditModal();
        await loadTodos();
    } catch (error) {
        showToast(`Lỗi: ${error.message}`, 'error');
    }
}

function handleFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    currentFilter = filter;
    
    // Update active button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Filter todos
    renderTodos();
}

async function handleToggleTodo(id) {
    try {
        await toggleTodo(id);
        await loadTodos();
        showToast('Cập nhật trạng thái thành công!', 'success');
    } catch (error) {
        showToast(`Lỗi: ${error.message}`, 'error');
    }
}

async function handleDeleteTodo(id, title) {
    if (!confirm(`Bạn có chắc muốn xóa công việc "${title}"?`)) {
        return;
    }
    
    try {
        await deleteTodo(id);
        showToast('Xóa công việc thành công!', 'success');
        await loadTodos();
    } catch (error) {
        showToast(`Lỗi: ${error.message}`, 'error');
    }
}

function handleEditClick(todo) {
    // Populate edit form
    document.getElementById('editTodoId').value = todo.id;
    document.getElementById('editTodoTitle').value = todo.title;
    document.getElementById('editTodoDescription').value = todo.description || '';
    document.getElementById('editTodoPriority').value = todo.priority;
    document.getElementById('editTodoCompleted').checked = todo.completed;
    
    // Format due date for datetime-local input
    if (todo.due_date) {
        const date = new Date(todo.due_date);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        document.getElementById('editTodoDueDate').value = localDate.toISOString().slice(0, 16);
    } else {
        document.getElementById('editTodoDueDate').value = '';
    }
    
    // Show modal
    editModal.style.display = 'block';
}

// UI Functions
async function loadTodos() {
    showLoading(true);
    
    try {
        const result = await fetchTodos();
        todos = result.data || [];
        renderTodos();
        updateCounts();
    } catch (error) {
        showToast(`Không thể tải danh sách công việc: ${error.message}`, 'error');
        todos = [];
        renderTodos();
    } finally {
        showLoading(false);
    }
}

function renderTodos() {
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    todoList.innerHTML = filteredTodos.map(todo => createTodoHTML(todo)).join('');
}

function getFilteredTodos() {
    switch (currentFilter) {
        case 'completed':
            return todos.filter(todo => todo.completed);
        case 'pending':
            return todos.filter(todo => !todo.completed);
        default:
            return todos;
    }
}

function createTodoHTML(todo) {
    const dueDate = todo.due_date ? new Date(todo.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && !todo.completed;
    
    return `
        <div class="todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}" 
             data-id="${todo.id}" style="animation-delay: ${Math.random() * 0.1}s">
            <div class="todo-header">
                <div>
                    <div class="todo-title">${escapeHtml(todo.title)}</div>
                    <div class="todo-meta">
                        <span class="priority-badge priority-${todo.priority}">
                            ${getPriorityText(todo.priority)}
                        </span>
                        ${dueDate ? `
                            <span class="due-date ${isOverdue ? 'overdue' : ''}">
                                <i class="fas fa-clock"></i>
                                ${formatDate(dueDate)}
                            </span>
                        ` : ''}
                        <span class="created-date">
                            <i class="fas fa-calendar-plus"></i>
                            ${formatDate(new Date(todo.created_at))}
                        </span>
                    </div>
                </div>
            </div>
            
            ${todo.description ? `
                <div class="todo-description">${escapeHtml(todo.description)}</div>
            ` : ''}
            
            <div class="todo-actions">
                <button class="action-btn btn-toggle ${todo.completed ? 'completed' : ''}" 
                        onclick="handleToggleTodo('${todo.id}')">
                    <i class="fas ${todo.completed ? 'fa-undo' : 'fa-check'}"></i>
                    ${todo.completed ? 'Hoàn tác' : 'Hoàn thành'}
                </button>
                <button class="action-btn btn-edit" 
                        onclick="handleEditClick(${JSON.stringify(todo).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                    Sửa
                </button>
                <button class="action-btn btn-delete" 
                        onclick="handleDeleteTodo('${todo.id}', '${escapeHtml(todo.title)}')">
                    <i class="fas fa-trash"></i>
                    Xóa
                </button>
            </div>
        </div>
    `;
}

function updateCounts() {
    const completedCount = todos.filter(todo => todo.completed).length;
    const pendingCount = todos.filter(todo => !todo.completed).length;
    const allCount = todos.length;
    
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('allCount').textContent = allCount;
}

function showLoading(show) {
    if (show) {
        loadingState.style.display = 'block';
        todoList.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
        todoList.style.display = 'block';
    }
}

function closeEditModal() {
    editModal.style.display = 'none';
    editTodoForm.reset();
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getPriorityText(priority) {
    const priorities = {
        low: 'Thấp',
        medium: 'Trung bình',
        high: 'Cao'
    };
    return priorities[priority] || priority;
}

// Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    const titles = {
        success: 'Thành công',
        error: 'Lỗi',
        info: 'Thông báo'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    container.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
    
    // Click to close
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    container.removeChild(toast);
                }
            }, 300);
        }
    });
}

// Add CSS for overdue items
const style = document.createElement('style');
style.textContent = `
    .due-date.overdue {
        color: #dc2626 !important;
        font-weight: 600;
    }
    
    .due-date.overdue i {
        animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);

// Service Worker for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Auto-refresh todos every 30 seconds (optional)
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadTodos();
    }
}, 30000);

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Đã kết nối lại internet', 'success');
    loadTodos();
});

window.addEventListener('offline', () => {
    showToast('Mất kết nối internet', 'error');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add todo
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement.closest('#addTodoForm')) {
            addTodoForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Alt + 1, 2, 3 to switch filters
    if (e.altKey && ['1', '2', '3'].includes(e.key)) {
        const filterIndex = parseInt(e.key) - 1;
        const filterButton = filterButtons[filterIndex];
        if (filterButton) {
            filterButton.click();
        }
    }
});

// Add some helpful console messages
console.log('%c🚀 Todo List App Initialized!', 'color: #667eea; font-size: 16px; font-weight: bold;');
console.log('Keyboard shortcuts:');
console.log('• Ctrl/Cmd + Enter: Submit add form');
console.log('• Alt + 1/2/3: Switch filters');
console.log('• Escape: Close modal');
