document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    if (!username) {
        alert('사용자 정보를 찾을 수 없습니다.');
        window.location.href = '/templates/login.html'; // 또는 적절한 페이지로 리다이렉트
        return;
    }

    loadPrivacySettings(username);

    document.getElementById('saveBtn').addEventListener('click', function(e) {
        e.preventDefault();
        updatePrivacySettings(username);
    });

    document.getElementById('cancelBtn').addEventListener('click', function() {
        window.location.href = `/templates/profile.html?username=${username}`;
    });

    document.getElementById('changePasswordBtn').addEventListener('click', function(e) {
        e.preventDefault();
        changePassword();
    });

    document.getElementById('deactivateAccountBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('정말로 계정을 비활성화하시겠습니까? 이 작업은 되돌릴 수 있지만, 즉시 로그아웃됩니다.')) {
            deactivateAccount();
        }
    });

    document.getElementById('deleteAccountBtn').addEventListener('click', function(e) {
        e.preventDefault();
        deleteAccount();
    });
});

function loadPrivacySettings(username) {
    fetch(`http://127.0.0.1:8000/accounts/privacy-settings/${username}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        setDefaultValues();
        Object.keys(data).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = data[key];
            }
        });
    })
    .catch(error => {
        console.error('Error:', error);
        setDefaultValues();
    });
}

function setDefaultValues() {
    const defaults = {
        follower_can_see_email: false,
        follower_can_see_bio: true,
        follower_can_see_posts: true,
        follower_can_see_following_list: true,
        follower_can_see_follower_list: true,
        following_can_see_email: false,
        following_can_see_bio: true,
        following_can_see_posts: true,
        following_can_see_following_list: true,
        following_can_see_follower_list: true,
        others_can_see_email: false,
        others_can_see_bio: true,
        others_can_see_posts: true,
        others_can_see_following_list: false,
        others_can_see_follower_list: false
    };

    Object.keys(defaults).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = defaults[key];
        }
    });
}

function updatePrivacySettings(username) {
    const formData = {};
    document.querySelectorAll('#privacySettingsForm input[type="checkbox"]').forEach(checkbox => {
        formData[checkbox.id] = checkbox.checked;
    });

    const method = Object.keys(formData).length === 15 ? 'PUT' : 'PATCH';

    fetch(`http://127.0.0.1:8000/accounts/privacy-settings/${username}/`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(formData),
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            if(response.status === 403) {
                throw new Error('권한이 없습니다. 로그인 상태를 확인해주세요.');
            }
            return response.json().then(err => {
                throw new Error(err.detail || 'Network response was not ok');
            });
        }
        return response.json();
    })
    .then(data => {
        alert(data.detail || '설정이 성공적으로 업데이트되었습니다.');
        window.location.href = `/templates/profile.html?username=${username}`;
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

function changePassword() {
    const oldPassword = document.getElementById('old_password').value;
    const newPassword = document.getElementById('new_password').value;

    if (!oldPassword || !newPassword) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    fetch('http://127.0.0.1:8000/accounts/change-password/', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        }),
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || JSON.stringify(err));
            });
        }
        return response.json();
    })
    .then(data => {
        alert(data.detail);
        window.location.href = '/templates/login.html'; // 로그아웃되므로 로그인 페이지로 리다이렉트
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

function deactivateAccount() {
    fetch('http://127.0.0.1:8000/accounts/deactivate/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || '계정 비활성화 중 오류가 발생했습니다.');
            });
        }
        return response.json();
    })
    .then(data => {
        alert(data.detail);
        window.location.href = '/templates/login.html'; // 로그아웃되므로 로그인 페이지로 리다이렉트
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

function deleteAccount() {
    const confirmation = document.getElementById('deleteConfirmation').value;

    if (confirmation !== 'DELETE') {
        alert('올바른 확인 코드를 입력해주세요. 계정을 삭제하려면 "DELETE"를 입력하세요.');
        return;
    }

    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
        return;
    }

    fetch('http://127.0.0.1:8000/accounts/delete/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || '계정 삭제 중 오류가 발생했습니다.');
            });
        }
        return response.json();
    })
    .then(data => {
        alert(data.detail);
        // 계정이 삭제되었으므로 로그인 페이지로 리다이렉트
        window.location.href = '/templates/login.html';
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

function getCurrentUsername() {
    // 이 함수는 현재 로그인한 사용자의 username을 반환해야 합니다.
    // 예를 들어, localStorage나 세션에서 가져올 수 있습니다.
    return localStorage.getItem('username') || '';
}

function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
