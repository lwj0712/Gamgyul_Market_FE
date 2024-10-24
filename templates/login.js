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
                    'Accept': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }

            const tokenData = await response.json();
            setJWTToken(tokenData.access); // JWT 토큰 저장

            // 사용자 정보 가져오기
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
            // 사용자 정보를 JSON 형태로 저장
            setCurrentUser({
                uuid: userData.uuid,
                email: userData.email,
                username: userData.username,
                profile_image: userData.profile_image
            });

            // 로그인 성공 처리
            alert('로그인에 성공했습니다!');
            window.location.href = '/templates/index.html';

        } catch (error) {
            console.error('로그인 오류:', error);
            errorMessage.textContent = error.message || '로그인에 실패했습니다.';
            errorMessage.classList.remove('d-none');
            
            // 에러 발생 시 토큰과 사용자 정보 제거
            removeJWTToken();
            removeCurrentUser();
        }
    });
});

// JWT 토큰 관리를 위한 유틸리티 함수들
const authUtils = {
    async refreshToken() {
        const token = getJWTToken();
        if (!token) {
            throw new Error('Refresh token not found');
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: token
                })
            });

            if (!response.ok) {
                throw new Error('토큰 갱신 실패');
            }

            const tokens = await response.json();
            setJWTToken(tokens.access);
            return tokens.access;
        } catch (error) {
            this.logout();
            throw error;
        }
    },

    getAuthHeaders() {
        const token = getJWTToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    },

    logout() {
        removeJWTToken();
        removeCurrentUser();
        window.location.href = '/templates/login.html';
    },

    isAuthenticated() {
        return !!getJWTToken() && !!localStorage.getItem('user');
    }
};

// 전역 스코프에 authUtils 노출
window.authUtils = authUtils;