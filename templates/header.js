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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const signOutLink = document.getElementById('sign-out-link');
    if (signOutLink) {
      signOutLink.addEventListener('click', handleLogout);
    }
  
    loadLoggedInUserProfile();
    initializeDropdowns(); // 드롭다운 초기화 함수 호출
  });