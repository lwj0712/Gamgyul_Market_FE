// Constants
const API_BASE_URL = 'http://127.0.0.1:8000';

// JWT 토큰 관리 유틸리티
function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

function setJWTToken(token) {
    localStorage.setItem('jwt_token', token);
}

function removeJWTToken() {
    localStorage.removeItem('jwt_token');
}

function setCurrentUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
}

function removeCurrentUser() {
    localStorage.removeItem('user');
}

// 로그인 페이지 초기화
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // 이미 로그인된 상태라면 메인 페이지로 리다이렉트
    if (getJWTToken() && localStorage.getItem('user')) {
        window.location.href = '/templates/index.html';
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.textContent = '';

        const formData = new FormData(form);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            // 로그인 요청
            const response = await fetch(`${API_BASE_URL}/api/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }

            const tokenData = await response.json();
            
            // JWT 토큰 저장
            localStorage.setItem('jwt_token', tokenData.access);

            // 사용자 정보 요청
            const userResponse = await fetch(`${API_BASE_URL}/accounts/current-user/`, {
                headers: {
                    'Authorization': `Bearer ${tokenData.access}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!userResponse.ok) {
                throw new Error('사용자 정보를 가져오는데 실패했습니다.');
            }

            const userData = await userResponse.json();
            
            // 사용자 정보를 localStorage에 저장
            localStorage.setItem('user', JSON.stringify({
                uuid: userData.id,
                email: userData.email,
                username: userData.username,
                profile_image: userData.profile_image
            }));

            // 로그인 성공 시 리다이렉트
            window.location.href = '/templates/index.html';
        } catch (error) {
            console.error('로그인 오류:', error);
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('d-none');
        }
    });
});