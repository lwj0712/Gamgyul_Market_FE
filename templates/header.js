// Constants and Config
const API_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_PROFILE_IMAGE = '/templates/images/placeholder.jpg';

// JWT 관련 유틸리티 함수
function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

function setJWTToken(token) {
    localStorage.setItem('jwt_token', token);
}

function removeJWTToken() {
    localStorage.removeItem('jwt_token');
}

// 현재 사용자 정보 관련 함수
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    const token = getJWTToken();
    
    if (!userStr || !token) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        return null;
    }
}

function isLoggedIn() {
    return !!getJWTToken() && !!getCurrentUser();
}

async function fetchWithAuth(url, method = 'GET', body = null) {
    const token = getJWTToken();
    if (!token && !url.includes('/login/')) {
        window.location.href = '/templates/login.html';
        return null;
    }

    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
        removeJWTToken();
        localStorage.removeItem('user');
        window.location.href = '/templates/login.html';
        return null;
    }

    return response;
}

function getFullImageUrl(imageUrl) {
    if (!imageUrl) return DEFAULT_PROFILE_IMAGE;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    return `${API_BASE_URL}${imageUrl}`;
}

function showErrorMessage(message) {
    console.error(message);
    showToast(message, 'danger');
}

function showSuccessMessage(message) {
    console.log(message);
    showToast(message, 'success');
}

// Toast message utility function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    // Initialize and show toast using Bootstrap
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 3000
    });
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Bootstrap Dropdowns 초기화
function initializeDropdowns() {
    if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
        const dropdownElementList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
        dropdownElementList.map(function (dropdownToggleEl) {
            return new bootstrap.Dropdown(dropdownToggleEl);
        });
    }
}

// Header-specific Functions
function updateProfileDropdown(profileData) {
    if (!profileData) return;

    const navProfileImage = document.getElementById('nav-profile-image');
    const dropdownProfileImage = document.getElementById('dropdown-profile-image');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const viewProfileLink = document.getElementById('view-profile-link');
    const profileSettingsLink = document.getElementById('profile-settings-link');

    if (navProfileImage) navProfileImage.src = getFullImageUrl(profileData.profile_image);
    if (dropdownProfileImage) dropdownProfileImage.src = getFullImageUrl(profileData.profile_image);
    if (dropdownUsername) dropdownUsername.textContent = profileData.username;
    if (dropdownEmail) dropdownEmail.textContent = profileData.email;

    if (viewProfileLink) {
        viewProfileLink.href = `/templates/profile.html?uuid=${profileData.id}`;
    }

    if (profileSettingsLink) {
        profileSettingsLink.href = `/templates/profile-settings.html?uuid=${profileData.id}`;
    }
}

async function loadLoggedInUserProfile() {
    if (!isLoggedIn()) {
        console.log('사용자가 로그인하지 않았습니다.');
        return;
    }

    try {
        // 먼저 current-user 정보를 가져옵니다
        const response = await fetchWithAuth(`${API_BASE_URL}/accounts/current-user/`);
        if (!response) return;

        if (response.ok) {
            const userData = await response.json();
            // 가져온 최신 사용자 정보로 localStorage 업데이트
            localStorage.setItem('user', JSON.stringify({
                uuid: userData.uuid,
                email: userData.email,
                username: userData.username
            }));
            
            updateProfileDropdown(userData);
        } else {
            throw new Error('로그인한 사용자 프로필 로드 실패');
        }
    } catch (error) {
        console.error('로그인한 사용자 프로필 로드 중 오류 발생:', error);
        showErrorMessage('로그인한 사용자 프로필을 불러오는 데 실패했습니다.');
    }
}

async function handleLogout(e) {
    e.preventDefault();
    removeJWTToken();
    localStorage.removeItem('user');
    window.location.href = '/templates/login.html';
}

// Notification Functions
let notifications = [];
let currentUserId;

async function fetchCurrentUserInfo() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/accounts/current-user/`);
        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        } else {
            throw new Error('Failed to fetch current user info');
        }
    } catch (error) {
        console.error('Error fetching current user info:', error);
        showErrorMessage('사용자 정보를 불러오는 데 실패했습니다.');
    }
}

// 알림 관련 함수들
function updateNotificationCount() {
    const notificationCount = document.getElementById('notification-count');
    const notificationBadge = document.getElementById('notification-badge');
    const count = notifications.length;
    if (notificationCount) notificationCount.textContent = count;
    if (notificationBadge) notificationBadge.style.display = count > 0 ? 'inline' : 'none';
}

function renderNotifications() {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList || !Array.isArray(notifications)) return;

    notificationList.innerHTML = '';
    notifications.forEach((notification) => {
        // sender가 없거나 profile_image가 없는 경우를 대비해 기본값 설정
        const senderProfileImage = notification.sender?.profile_image || DEFAULT_PROFILE_IMAGE;
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="list-group-item list-group-item-action rounded d-flex border-0 mb-1 p-3">
                <div class="avatar text-center d-none d-sm-inline-block">
                    <img class="avatar-img rounded-circle" src="${getFullImageUrl(senderProfileImage)}" alt="">
                </div>
                <div class="ms-sm-3 d-flex">
                    <div>
                        <p class="small mb-2">${notification.message || '알림 내용이 없습니다.'}</p>
                        <p class="small ms-3">${new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                    <button class="btn btn-sm btn-danger-soft ms-auto" onclick="deleteNotification('${notification.id}')">삭제</button>
                </div>
            </div>
        `;
        notificationList.appendChild(li);
    });
    updateNotificationCount();
}

async function fetchNotifications() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/notifications/`);
        if (response && response.ok) {
            const data = await response.json();
            notifications = Array.isArray(data) ? data : (data.results || []);
            renderNotifications();
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
        showErrorMessage('알림을 불러오는 데 실패했습니다.');
    }
}

async function deleteNotification(notificationId) {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/notifications/${notificationId}/`,  // URL 수정
            'DELETE'
        );
        if (response && response.ok) {
            notifications = notifications.filter(n => n.id !== notificationId);
            renderNotifications();
            showSuccessMessage('알림이 삭제되었습니다.');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showErrorMessage('알림 삭제 중 오류가 발생했습니다.');
    }
}

async function clearAllNotifications() {
    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/notifications/delete_all/`, 
            'DELETE'
        );
        if (response && response.ok) {
            notifications = [];
            renderNotifications();
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        showErrorMessage('모든 알림 삭제 중 오류가 발생했습니다.');
    }
}

// 초기화 함수
async function init() {
    try {
        if (!isLoggedIn()) return;

        // current-user 정보를 가져오고 저장
        const response = await fetchWithAuth(`${API_BASE_URL}/accounts/current-user/`);
        if (!response || !response.ok) {
            throw new Error('사용자 정보를 가져오는데 실패했습니다.');
        }

        const userData = await response.json();
        console.log('Current user data:', userData); // 데이터 확인용 로그

        // 사용자 정보 업데이트
        localStorage.setItem('user', JSON.stringify({
            uuid: userData.id,
            email: userData.email,
            username: userData.username,
            profile_image: userData.profile_image
        }));

        // UI 업데이트
        updateProfileDropdown(userData);

        // WebSocket 연결 설정 (사용자 정보가 저장된 후에 실행)
        if (userData.id) {
            setupWebSocket(userData.id);
        } else {
            console.error('User UUID not found in response:', userData);
        }

        // 알림 가져오기
        await fetchNotifications();
    } catch (error) {
        console.error('Error initializing application:', error);
        showErrorMessage('애플리케이션을 초기화하는 데 실패했습니다.');
    }
}

function setupWebSocket(userId) {
    if (!userId) {
        const currentUser = getCurrentUser();
        userId = currentUser?.uuid;
    }
    
    if (!userId) {
        console.error('User ID not available for WebSocket connection');
        return;
    }

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws/notifications/${userId}/`;
    console.log('Attempting to connect to:', wsUrl);
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = function(e) {
        console.log('WebSocket connection established');
    };

    socket.onmessage = function(e) {
        try {
            const data = JSON.parse(e.data);
            console.log('Received WebSocket message:', data);
            if (data.notification) {  // 백엔드의 메시지 포맷에 맞춤
                notifications.unshift(data.notification);
                renderNotifications();
                // 알림음 재생이나 토스트 메시지 표시 등 추가 가능
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };

    socket.onclose = function(e) {
        if (e.wasClean) {
            console.log(`WebSocket closed cleanly, code=${e.code}, reason=${e.reason}`);
        } else {
            console.log('WebSocket connection died');
        }
        // 재연결 시도 전에 연결 상태 확인
        if (!document.hidden) {  // 페이지가 보이는 상태일 때만 재연결
            setTimeout(() => setupWebSocket(userId), 5000);
        }
    };

    socket.onerror = function(e) {
        console.error('WebSocket error occurred:', e);
        console.log('WebSocket readyState:', socket.readyState);
        console.log('WebSocket URL:', socket.url);
    };

    return socket;
}

// Event Listeners and Initialization
document.addEventListener('DOMContentLoaded', function() {
    // 로그인 상태 체크
    if (!isLoggedIn()) {
        if (!window.location.pathname.includes('/login.html')) {
            window.location.href = '/templates/login.html';
            return;
        }
    }

    const signOutLink = document.getElementById('sign-out-link');
    const clearAllNotificationsBtn = document.getElementById('clear-all-notifications');

    if (signOutLink) {
        signOutLink.addEventListener('click', handleLogout);
    }

    if (clearAllNotificationsBtn) {
        clearAllNotificationsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearAllNotifications();
        });
    }

    // Bootstrap Dropdowns 초기화
    initializeDropdowns();

    // 초기화 함수 실행
    if (isLoggedIn()) {
        init().catch(error => {
            console.error('Initialization failed:', error);
            showErrorMessage('초기화 중 오류가 발생했습니다.');
        });
    }
});

// 전역 스코프에 필요한 함수들 노출
window.deleteNotification = deleteNotification;
