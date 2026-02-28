// ==================== 1. 等待DOM加载完成 ====================
document.addEventListener('DOMContentLoaded',() => {
    console.log('页面加载完成，初始化应用...');
    // ==================== 2. 全局变量和配置 ====================
    const API_BASE_URL = 'http://localhost:3000/api';
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let allTasks = [];
    let currentEditId = null;
    // ==================== 3. 初始化应用 ====================
    function init() {
        console.log('初始化应用...');
        const elements = {
            taskInput: document.getElementById('taskInput'),
            prioritySelect: document.getElementById('prioritySelect'),
            addTaskBtn: document.getElementById('addTaskBtn'),
            tasksContainer: document.getElementById('tasksContainer'),
            noTasksMessage: document.getElementById('noTasksMessage'),
            loading: document.getElementById('loading'),
            totalTasks: document.getElementById('totalTasks'),
            pendingTasks: document.getElementById('pendingTasks'),
            completedTasks: document.getElementById('completedTasks'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('searchInput'),
            taskModal: document.getElementById('taskModal'),
            closeModal: document.querySelector('.close-modal'),
            editTaskText: document.getElementById('editTaskText'),
            editPriority: document.getElementById('editPriority'),
            editCompleted: document.getElementById('editCompleted'),
            saveTaskBtn: document.getElementById('saveTaskBtn'),
            deleteTaskBtn: document.getElementById('deleteTaskBtn')
        };
        if (!elements.tasksContainer) {
            console.error('找不到必要的DOM元素');
            return;
        }
        bindEvents(elements);
        fetchTasks(elements);
    }
    // ==================== 4. 绑定所有事件 ====================
    function bindEvents(elements) {
        console.log('绑定事件监听器...');
        elements.addTaskBtn.addEventListener('click', () => {
            addNewTask(elements);
        });
        elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNewTask(elements);
            }
        });
        elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                elements.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                console.log('过滤条件变更为:', currentFilter);
                renderTasks(elements);
            });
        });
        let searchTimeout;
        elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = e.target.value.toLowerCase();
                console.log('搜索关键词:', currentSearchTerm);
                renderTasks(elements);
            }, 300);
        });
        elements.closeModal.addEventListener('click', () => {
            closeModal(elements);
        });
        window.addEventListener('click', (e) => {
            if (e.target === elements.taskModal) {
                closeModal(elements);
            }
        });
        elements.saveTaskBtn.addEventListener('click', () => {
            saveTaskEdit(elements);
        });
        elements.deleteTaskBtn.addEventListener('click', () => {
            deleteTaskFromModal(elements);
        });
    }
    // ==================== 5. 从后端获取任务 ====================
    function fetchTasks(elements) {
        elements.loading.style.display = 'block';
        elements.tasksContainer.innerHTML = '';
        console.log('正在获取任务数据...');
        fetch(`${API_BASE_URL}/tasks`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json(); 
            })
            .then(tasks => {
                console.log(`成功获取 ${tasks.length} 个任务`);
                allTasks = tasks;
                elements.loading.style.display = 'none';
                updateStats(elements);
                renderTasks(elements);
            })
            .catch(error => {
                console.error('获取任务失败:', error);
                elements.loading.style.display = 'none';
                elements.tasksContainer.innerHTML = `
                    <div class="no-tasks" style="color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载失败，请确保后端服务器已启动！</p>
                        <p style="font-size: 0.9rem; margin-top: 10px;">${error.message}</p>
                    </div>
                `;
            });
    }
    // ==================== 6. 渲染任务列表 ====================
    function renderTasks(elements) {
        console.log('渲染任务列表...');
        let filteredTasks = allTasks.filter(task => {
            if (currentFilter === 'pending' && task.completed === 1) return false;
            if (currentFilter === 'completed' && task.completed === 0) return false;
            return true;
        });
        if (currentSearchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(currentSearchTerm)
            );
        }
        if (filteredTasks.length === 0) {
            elements.tasksContainer.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-clipboard-list"></i>
                    <p>${currentSearchTerm ? '没有找到匹配的任务' : '暂无任务，添加你的第一个任务吧！'}</p>
                </div>
            `;
            return;
        }
        let tasksHTML = '';
        
        filteredTasks.forEach(task => {
            const createdDate = new Date(task.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const priorityText = {
                low: '低优先级',
                medium: '中优先级',
                high: '高优先级'
            }[task.priority] || '中优先级';
            tasksHTML += `
                <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <!-- 优先级指示点 -->
                    <div class="task-priority priority-${task.priority}"></div>
                    
                    <!-- 任务内容 -->
                    <div class="task-content">
                        <div class="task-text ${task.completed ? 'completed' : ''}">
                            ${escapeHtml(task.text)}
                        </div>
                        <div class="task-meta">
                            <span><i class="fas fa-flag"></i> ${priorityText}</span>
                            <span><i class="fas fa-clock"></i> ${createdDate}</span>
                        </div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="toggleTaskComplete(${task.id}, ${task.completed})" title="${task.completed ? '标记未完成' : '标记完成'}">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="openEditModal(${task.id})" title="编辑任务">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask(${task.id})" title="删除任务">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        elements.tasksContainer.innerHTML = tasksHTML;
    }
    // ==================== 7. HTML转义（防止XSS攻击） ====================
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    // ==================== 8. 更新统计信息 ====================
    function updateStats(elements) {
        const total = allTasks.length;
        const pending = allTasks.filter(t => t.completed === 0).length;
        const completed = allTasks.filter(t => t.completed === 1).length;
        elements.totalTasks.textContent = total;
        elements.pendingTasks.textContent = pending;
        elements.completedTasks.textContent = completed;
        console.log(`统计信息 - 总计:${total}, 待完成:${pending}, 已完成:${completed}`);
    }
    // ==================== 9. 添加新任务 ====================
    function addNewTask(elements) {
        const text = elements.taskInput.value.trim();
        const priority = elements.prioritySelect.value;
        if (!text) {
            alert('请输入任务内容！');
            elements.taskInput.focus();
            return;
        }
        console.log('正在添加新任务:', { text, priority });
        elements.addTaskBtn.disabled = true;
        elements.addTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 添加中...';
        fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, priority })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('添加失败');
            }
            return response.json();
        })
        .then(newTask => {
            console.log('任务添加成功:', newTask);
            elements.taskInput.value = '';
            fetchTasks(elements);
        })
        .catch(error => {
            console.error('添加任务失败:', error);
            alert('添加失败，请稍后重试！');
        })
        .finally(() => {
            elements.addTaskBtn.disabled = false;
            elements.addTaskBtn.innerHTML = '<i class="fas fa-plus"></i> 添加任务';
        });
    }
    // ==================== 10. 切换任务完成状态 ====================
    // 这个函数会被任务列表中的按钮调用，所以需要挂载到window对象
    window.toggleTaskComplete = function(id, currentStatus) {
        console.log(`切换任务 ${id} 完成状态:`, currentStatus);
        const newStatus = currentStatus === 1 ? 0 : 1;
        fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: newStatus })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('更新失败');
            }
            return response.json();
        })
        .then(updatedTask => {
            console.log('状态更新成功:', updatedTask);
            const index = allTasks.findIndex(t => t.id === id);
            if (index !== -1) {
                allTasks[index] = updatedTask;
            }
            updateStats(document);
            renderTasks(document);
        })
        .catch(error => {
            console.error('更新失败:', error);
            alert('更新失败，请稍后重试！');
        });
    };
    // ==================== 11. 打开编辑模态框 ====================
    // 这个函数会被任务列表中的编辑按钮调用，所以需要挂载到window对象
    window.openEditModal = function(id) {
        console.log(`打开编辑模态框,任务ID: ${id}`);
        currentEditId = id;
        const task = allTasks.find(t => t.id === id);
        if (!task) {
            console.error('未找到任务:', id);
            return;
        }
        console.log('任务数据:', task);
        const modal = document.getElementById('taskModal');
        const editTaskText = document.getElementById('editTaskText');
        const editPriority = document.getElementById('editPriority');
        const editCompleted = document.getElementById('editCompleted');
        editTaskText.value = task.text;
        editPriority.value = task.priority;
        editCompleted.checked = task.completed === 1;
        modal.style.display = 'block';
    };
    // ==================== 12. 关闭模态框 ====================
    function closeModal(elements) {
        console.log('关闭模态框');
        if (!elements) {
            document.getElementById('taskModal').style.display = 'none';
            currentEditId = null;
            return;
        }
        elements.taskModal.style.display = 'none';
        currentEditId = null;
    }
    // ==================== 13. 保存编辑 ====================
    function saveTaskEdit(elements) {
        if (!currentEditId) {
            console.error('没有正在编辑的任务');
            return;
        }
        const text = elements.editTaskText.value.trim();
        const priority = elements.editPriority.value;
        const completed = elements.editCompleted.checked ? 1 : 0;
        if (!text) {
            alert('任务内容不能为空！');
            return;
        }
        console.log('正在保存编辑:', { id: currentEditId, text, priority, completed });
        elements.saveTaskBtn.disabled = true;
        elements.saveTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        fetch(`${API_BASE_URL}/tasks/${currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, priority, completed })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('保存失败');
            }
            return response.json();
        })
        .then(updatedTask => {
            console.log('保存成功:', updatedTask);
            const index = allTasks.findIndex(t => t.id === currentEditId);
            if (index !== -1) {
                allTasks[index] = updatedTask;
            }
            closeModal(elements);
            updateStats(elements);
            renderTasks(elements);
            showNotification('任务更新成功！', 'success');
        })
        .catch(error => {
            console.error('保存失败:', error);
            alert('保存失败，请稍后重试！');
        })
        .finally(() => {
            elements.saveTaskBtn.disabled = false;
            elements.saveTaskBtn.innerHTML = '保存更改';
        });
    }
    // ==================== 14. 删除任务（从列表直接删除） ====================
    window.deleteTask = function(id) {
        console.log(`尝试删除任务: ${id}`);
        if (!confirm('确定要删除这个任务吗？此操作不可恢复！')) {
            return;
        }
        fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除失败');
            }
            return response.json();
        })
        .then(data => {
            console.log('删除成功:', data);
            allTasks = allTasks.filter(t => t.id !== id);
            updateStats(document);
            renderTasks(document);
            showNotification('任务删除成功！', 'success');
        })
        .catch(error => {
            console.error('删除失败:', error);
            alert('删除失败，请稍后重试！');
        });
    };
    // ==================== 15. 从模态框中删除任务 ====================
    function deleteTaskFromModal(elements) {
        if (!currentEditId) {
            console.error('没有正在编辑的任务');
            closeModal(elements);
            return;
        }
        console.log(`从模态框删除任务: ${currentEditId}`);
        if (!confirm('确定要删除这个任务吗？此操作不可恢复！')) {
            return;
        }
        elements.deleteTaskBtn.disabled = true;
        elements.deleteTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
        fetch(`${API_BASE_URL}/tasks/${currentEditId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除失败');
            }
            return response.json();
        })
        .then(data => {
            console.log('删除成功:', data);
            allTasks = allTasks.filter(t => t.id !== currentEditId);
            closeModal(elements);
            updateStats(elements);
            renderTasks(elements);
            showNotification('任务删除成功！', 'success');
        })
        .catch(error => {
            console.error('删除失败:', error);
            alert('删除失败，请稍后重试！');
        })
        .finally(() => {
            elements.deleteTaskBtn.disabled = false;
            elements.deleteTaskBtn.innerHTML = '删除任务';
        });
    }
    // ==================== 16. 显示通知提示（可选功能） ====================
    function showNotification(message, type = 'info') {
        let notificationContainer = document.querySelector('.notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2000;
            `;
            document.body.appendChild(notificationContainer);
        }
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background-color: ${type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle';
        notification.appendChild(icon);
        const text = document.createElement('span');
        text.textContent = message;
        notification.appendChild(text);
        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
                if (notificationContainer.children.length === 0) {
                    notificationContainer.remove();
                }
            }, 300);
        }, 3000);
    }
    // ==================== 17. 添加动画样式（动态添加到页面） ====================
    // 检查是否已添加动画样式
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    // ==================== 18. 完整的元素获取函数（确保所有元素都存在） ====================
    // 这个函数用来确保我们在任何时候都能获取到最新的DOM元素
    function getElements() {
        return {
            taskInput: document.getElementById('taskInput'),
            prioritySelect: document.getElementById('prioritySelect'),
            addTaskBtn: document.getElementById('addTaskBtn'),
            tasksContainer: document.getElementById('tasksContainer'),
            noTasksMessage: document.getElementById('noTasksMessage'),
            loading: document.getElementById('loading'),
            totalTasks: document.getElementById('totalTasks'),
            pendingTasks: document.getElementById('pendingTasks'),
            completedTasks: document.getElementById('completedTasks'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('searchInput'),
            taskModal: document.getElementById('taskModal'),
            closeModal: document.querySelector('.close-modal'),
            editTaskText: document.getElementById('editTaskText'),
            editPriority: document.getElementById('editPriority'),
            editCompleted: document.getElementById('editCompleted'),
            saveTaskBtn: document.getElementById('saveTaskBtn'),
            deleteTaskBtn: document.getElementById('deleteTaskBtn')
        };
    }
    // ==================== 19. 修改之前的函数，使用getElements ====================
    // 为了确保所有函数都能正常工作，我们需要修改几个函数来使用getElements

    // 重写updateStats函数（无参数版本）
    function updateStats(elements) {
        // 如果没有传入elements，就获取最新的
        const el = elements || getElements();
        const total = allTasks.length;
        const pending = allTasks.filter(t => t.completed === 0).length;
        const completed = allTasks.filter(t => t.completed === 1).length;
        el.totalTasks.textContent = total;
        el.pendingTasks.textContent = pending;
        el.completedTasks.textContent = completed;
        console.log(`统计信息 - 总计:${total}, 待完成:${pending}, 已完成:${completed}`);
    }
    // 重写renderTasks函数（无参数版本）
    function renderTasks(elements) {
        // 如果没有传入elements，就获取最新的
        const el = elements || getElements();
        console.log('渲染任务列表...');
        let filteredTasks = allTasks.filter(task => {
            if (currentFilter === 'pending' && task.completed === 1) return false;
            if (currentFilter === 'completed' && task.completed === 0) return false;
            return true;
        });
        if (currentSearchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(currentSearchTerm)
            );
        }
        if (filteredTasks.length === 0) {
            el.tasksContainer.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-clipboard-list"></i>
                    <p>${currentSearchTerm ? '没有找到匹配的任务' : '暂无任务，添加你的第一个任务吧！'}</p>
                </div>
            `;
            return;
        }
        let tasksHTML = '';
        filteredTasks.forEach(task => {
            const createdDate = new Date(task.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const priorityText = {
                low: '低优先级',
                medium: '中优先级',
                high: '高优先级'
            }[task.priority] || '中优先级';
            tasksHTML += `
                <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <div class="task-priority priority-${task.priority}"></div>
                    <div class="task-content">
                        <div class="task-text ${task.completed ? 'completed' : ''}">
                            ${escapeHtml(task.text)}
                        </div>
                        <div class="task-meta">
                            <span><i class="fas fa-flag"></i> ${priorityText}</span>
                            <span><i class="fas fa-clock"></i> ${createdDate}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="toggleTaskComplete(${task.id}, ${task.completed})" title="${task.completed ? '标记未完成' : '标记完成'}">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="openEditModal(${task.id})" title="编辑任务">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask(${task.id})" title="删除任务">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        el.tasksContainer.innerHTML = tasksHTML;
    }
    // ==================== 20. 修改初始化函数，使用getElements ====================
    function init() {
        console.log('初始化应用...');
        const elements = getElements();
        if (!elements.tasksContainer) {
            console.error('找不到必要的DOM元素');
            return;
        }
        bindEvents(elements);
        fetchTasks(elements);
    }
    // 注意：之前的bindEvents函数已经使用了传入的elements，所以不需要修改
    // fetchTasks函数也不需要修改，因为它已经使用传入的elements
    init();
});