// Constants and Config
const API_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_PROFILE_IMAGE = '/templates/images/team_profile.png';

// Utility Functions
function getCurrentUsername() {
    return localStorage.getItem('username') || '';
}

function getCSRFToken() {
    const csrfCookie = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
}

async function fetchWithCSRF(url, method = 'GET', body = null) {
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
        throw new Error('CSRF token not found');
    }
    
    const options = {
        method: method,
        credentials: 'include',
        headers: {
            'X-CSRFToken': csrfToken,
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
    }

    return fetch(url, options);
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

// Header-specific Functions
function updateProfileDropdown(profileData) {
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
        viewProfileLink.href = `/templates/profile.html?username=${profileData.username}`;
    }

    if (profileSettingsLink) {
        profileSettingsLink.href = `/templates/profile-settings.html?username=${profileData.username}`;
    }
}

async function loadLoggedInUserProfile() {
    try {
        const loggedInUsername = getCurrentUsername();
        if (!loggedInUsername) {
            throw new Error('로그인한 사용자 정보를 찾을 수 없습니다.');
        }
        const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/profile/${loggedInUsername}/`);
        if (response.ok) {
            const profileData = await response.json();
            updateProfileDropdown(profileData);
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
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/logout/`, 'POST');
        if (response.ok) {
            localStorage.removeItem('username');
            window.location.href = '/templates/login.html';
        } else {
            throw new Error('로그아웃 실패');
        }
    } catch (error) {
        console.error('로그아웃 중 오류 발생:', error);
        showErrorMessage('로그아웃 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
}

function initializeDropdowns() {
    var dropdownElementList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'))
    var dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
      return new bootstrap.Dropdown(dropdownToggleEl)
    })
}

// Notification Functions
let notifications = [];
let currentUserId;

async function fetchCurrentUserInfo() {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/current-user/`);
        if (response.ok) {
            const userData = await response.json();
            currentUserId = userData.id;
            return userData;
        } else {
            throw new Error('Failed to fetch current user info');
        }
    } catch (error) {
        console.error('Error fetching current user info:', error);
        showErrorMessage('사용자 정보를 불러오는 데 실패했습니다.');
    }
}

function updateNotificationCount() {
    const notificationCount = document.getElementById('notification-count');
    const notificationBadge = document.getElementById('notification-badge');
    const count = notifications.length;
    if (notificationCount) notificationCount.textContent = count;
    if (notificationBadge) notificationBadge.style.display = count > 0 ? 'inline' : 'none';
}

function renderNotifications() {

    if (!Array.isArray(notifications)) {
        console.error('notifications is not an array:', notifications);
        return; // 배열이 아니면 함수 종료
    }

    const notificationList = document.getElementById('notification-list');
    if (!notificationList) {
        console.error('Notification list element not found');
        return;
    }

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
        const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/`);
        if (response.ok) {
            const data = await response.json();
            
            // 서버 응답 구조에 따라 적절히 처리
            notifications = Array.isArray(data) ? data : (data.results || []);
            
            renderNotifications();
        } else {
            throw new Error('알림 가져오기 실패');
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
        showErrorMessage('알림을 불러오는 데 실패했습니다.');
    }
}


async function deleteNotification(notificationId) {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/${notificationId}/delete/`, 'DELETE');
        if (response.ok) {
            notifications = notifications.filter(n => n.id !== notificationId);
            renderNotifications();
        } else {
            throw new Error('알림 삭제 실패');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showErrorMessage('알림 삭제 중 오류가 발생했습니다.');
    }
}


async function clearAllNotifications() {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/delete-all/`, 'DELETE');
        if (response.ok) {
            notifications = [];
            renderNotifications();
        } else {
            throw new Error('모든 알림 삭제 실패');
        }
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        showErrorMessage('모든 알림 삭제 중 오류가 발생했습니다.');
    }
}

// WebSocket 설정 함수 수정
function setupWebSocket() {
    if (!currentUserId) {
        console.error('Current user ID is not available');
        return;
    }

    const socket = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws/alarm/${currentUserId}/`);

    socket.onopen = function(e) {
        console.log('WebSocket 연결 성공');
    };

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

    loadLoggedInUserProfile();
    initializeDropdowns();
    init();

    // 주기적으로 알림 업데이트 (선택사항)
    setInterval(fetchNotifications, 60000); // 1분마다 업데이트
});

// 전역 스코프에 deleteNotification 함수 추가
window.deleteNotification = deleteNotification;
