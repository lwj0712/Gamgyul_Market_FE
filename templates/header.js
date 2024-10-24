// Constants and Config
const API_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_PROFILE_IMAGE = '/templates/images/team_profile.png';

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
    // TODO: Implement UI error message display
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
        viewProfileLink.href = `/templates/profile.html?uuid=${profileData.uuid}`;
    }

    if (profileSettingsLink) {
        profileSettingsLink.href = `/templates/profile-settings.html?uuid=${profileData.uuid}`;
    }
}

async function loadLoggedInUserProfile() {
    if (!isLoggedIn()) {
        console.log('사용자가 로그인하지 않았습니다.');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.uuid) {
            throw new Error('로그인한 사용자 정보를 찾을 수 없습니다.');
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/accounts/profile/${currentUser.uuid}/`);
        if (!response) return; // fetchWithAuth에서 null을 반환한 경우

        if (response.ok) {
            const profileData = await response.json();
            updateProfileDropdown(profileData);
        } else {
            throw new Error('로그인한 사용자 프로필 로드 실패');
        }
    } catch (error) {
        console.error('로그인한 사용자 프로필 로드 중 오류 발생:', error);
        if (error.message !== '로그인한 사용자 정보를 찾을 수 없습니다.') {
            showErrorMessage('로그인한 사용자 프로필을 불러오는 데 실패했습니다.');
        }
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
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="list-group-item list-group-item-action rounded d-flex border-0 mb-1 p-3">
                <div class="avatar text-center d-none d-sm-inline-block">
                    <img class="avatar-img rounded-circle" src="${getFullImageUrl(notification.sender.profile_image)}" alt="">
                </div>
                <div class="ms-sm-3 d-flex">
                    <div>
                        <p class="small mb-2">${notification.message}</p>
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
        const response = await fetchWithAuth(`${API_BASE_URL}/alarm/`);
        if (response.ok) {
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
        const response = await fetchWithAuth(`${API_BASE_URL}/alarm/${notificationId}/delete/`, 'DELETE');
        if (response.ok) {
            notifications = notifications.filter(n => n.id !== notificationId);
            renderNotifications();
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showErrorMessage('알림 삭제 중 오류가 발생했습니다.');
    }
}

async function clearAllNotifications() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/alarm/delete-all/`, 'DELETE');
        if (response.ok) {
            notifications = [];
            renderNotifications();
        }
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        showErrorMessage('모든 알림 삭제 중 오류가 발생했습니다.');
    }
}

// WebSocket 설정
function setupWebSocket() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.uuid) {
        console.error('Current user UUID is not available');
        return;
    }

    const socket = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws/alarm/${currentUser.uuid}/`);

    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.alarm) {
            notifications.unshift(data.alarm);
            renderNotifications();
        }
    };

    socket.onclose = function(e) {
        console.error('Alarm socket closed unexpectedly');
        setTimeout(() => setupWebSocket(), 5000);
    };

    socket.onerror = function(e) {
        console.error('WebSocket error occurred', e);
    };
}

// 초기화 함수
async function init() {
    try {
        const userData = await fetchCurrentUserInfo();
        if (userData) {
            updateProfileDropdown(userData);
            setupWebSocket();
            await fetchNotifications();
        } else {
            throw new Error('Failed to initialize user data');
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        showErrorMessage('애플리케이션을 초기화하는 데 실패했습니다.');
    }
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

    if (isLoggedIn()) {
        loadLoggedInUserProfile();
        init();
        setInterval(fetchNotifications, 60000);
    }
});

// 전역 스코프에 필요한 함수들 노출
window.deleteNotification = deleteNotification;
