const API_BASE_URL = 'http://127.0.0.1:8000';

// JWT Token Utilities
function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

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
    if (!token) {
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
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        window.location.href = '/templates/login.html';
        return null;
    }

    return response;
}

document.addEventListener('DOMContentLoaded', async function() {
    if (!isLoggedIn()) {
        window.location.href = '/templates/login.html';
        return;
    }

    try {
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser.uuid) {
            throw new Error('Invalid user data');
        }

        await initializeSettingsPage(currentUser.uuid);
    } catch (error) {
        console.error('Failed to initialize page:', error);
        window.location.href = '/templates/login.html';
    }
});

async function initializeSettingsPage(userId) {
    await loadPrivacySettings(userId);
    setupEventListeners(userId);
}

function setupEventListeners(userId) {
    const backToProfileLink = document.getElementById('back-to-profile');

    document.getElementById('saveBtn').addEventListener('click', function(e) {
        e.preventDefault();
        updatePrivacySettings(userId);
    });

    document.getElementById('cancelBtn').addEventListener('click', function() {
        window.location.href = `/templates/profile.html?uuid=${userId}`;
    });

    document.getElementById('changePasswordBtn').addEventListener('click', function(e) {
        e.preventDefault();
        changePassword();
    });

    if (backToProfileLink) {
        backToProfileLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = `/templates/profile.html?uuid=${userId}`;
        });
    }
}

async function loadPrivacySettings(userId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/profiles/privacy-settings/${userId}/`);
        if (!response) return;

        if (response.ok) {
            const data = await response.json();
            setDefaultValues();
            updateCheckboxesFromSettings(data.privacy_settings);
        } else {
            throw new Error('Failed to load privacy settings');
        }
    } catch (error) {
        console.error('Error loading privacy settings:', error);
        setDefaultValues();
    }
}

async function updatePrivacySettings(userId) {
    const formData = {};
    const audiences = ['followers', 'following', 'others'];
    const fields = ['email', 'bio', 'posts', 'following_list', 'follower_list'];

    fields.forEach(field => {
        formData[field] = {};
        audiences.forEach(audience => {
            const checkbox = document.getElementById(`${field}_${audience}`);
            if (checkbox) {
                formData[field][audience] = checkbox.checked;
            }
        });
    });

    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/profiles/privacy-settings/${userId}/`,
            'PUT',
            { privacy_settings: formData }
        );

        if (response && response.ok) {
            const data = await response.json();
            alert(data.detail || '설정이 성공적으로 업데이트되었습니다.');
            window.location.href = `/templates/profile.html?uuid=${userId}`;
        }
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        alert('설정 업데이트에 실패했습니다.');
    }
}

async function changePassword() {
    const oldPassword = document.getElementById('old_password').value;
    const newPassword1 = document.getElementById('new_password1').value;
    const newPassword2 = document.getElementById('new_password2').value;

    if (!oldPassword || !newPassword1 || !newPassword2) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    if (newPassword1 !== newPassword2) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        const response = await fetchWithAuth(
            `${API_BASE_URL}/accounts/password/change-password/`,
            'POST',
            {
                old_password: oldPassword,
                new_password1: newPassword1,
                new_password2: newPassword2
            }
        );

        if (response && response.ok) {
            alert('비밀번호가 성공적으로 변경되었습니다.');
            window.location.href = '/templates/login.html';
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('비밀번호 변경에 실패했습니다.');
    }
}

function updateCheckboxesFromSettings(settings) {
    const audiences = ['followers', 'following', 'others'];
    const fields = ['email', 'bio', 'posts', 'following_list', 'follower_list'];

    fields.forEach(field => {
        audiences.forEach(audience => {
            const checkboxId = `${field}_${audience}`;
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.checked = settings[field]?.[audience] ?? false;
            }
        });
    });
}

function setDefaultValues() {
    const audiences = ['followers', 'following', 'others'];
    const fields = ['email', 'bio', 'posts', 'following_list', 'follower_list'];
    
    fields.forEach(field => {
        audiences.forEach(audience => {
            const checkboxId = `${field}_${audience}`;
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                // 이메일은 기본적으로 비공개, 나머지는 followers와 following에게 공개
                const isEmail = field === 'email';
                const isOthers = audience === 'others';
                checkbox.checked = !(isEmail || isOthers);
            }
        });
    });
}
