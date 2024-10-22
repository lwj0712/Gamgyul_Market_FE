document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.textContent = '';

        const formData = new FormData(form);
        
        // JSON 데이터로 변환
        const loginData = {
            email: formData.get('email'),      // 이메일로 로그인하는 경우
            password: formData.get('password')
        };

        try {
            // JWT 토큰 획득 요청
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'http://127.0.0.1:5500'
                },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }

            const data = await response.json();

            // JWT 토큰을 로컬 스토리지에 저장
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            // 사용자 정보 가져오기
            const userResponse = await fetch('http://127.0.0.1:8000/accounts/user/', {
                headers: {
                    'Authorization': `Bearer ${data.access}`,
                    'Content-Type': 'application/json'
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('username', userData.username);
                localStorage.setItem('user_email', userData.email);
            }

            // 로그인 성공 시 리다이렉트
            alert('로그인에 성공했습니다!');
            window.location.href = '/templates/index.html';
        } catch (error) {
            console.error('로그인 오류:', error);
            errorMessage.textContent = error.message || '로그인에 실패했습니다.';
            errorMessage.classList.remove('d-none');
        }
    });
});

// JWT 토큰 관리를 위한 유틸리티 함수들
const authUtils = {
    // 토큰 갱신
    async refreshToken() {
        const refresh_token = localStorage.getItem('refresh_token');
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: refresh_token
                })
            });

            if (!response.ok) {
                throw new Error('토큰 갱신 실패');
            }

            const tokens = await response.json();
            localStorage.setItem('access_token', tokens.access);
            return tokens.access;
        } catch (error) {
            // 토큰 갱신 실패시 로그아웃 처리
            this.logout();
            throw error;
        }
    },

    // 인증이 필요한 API 요청을 위한 헤더 생성
    getAuthHeaders() {
        const token = localStorage.setItem('access_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    },

    // 로그아웃
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        localStorage.removeItem('user_email');
        window.location.href = '/templates/login.html';
    },

    // 로그인 상태 확인
    isAuthenticated() {
        return !!localStorage.getItem('access_token');
    }
};