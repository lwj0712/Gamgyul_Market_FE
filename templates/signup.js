document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signup-form');
    const errorMessage = document.getElementById('error-message');
    const password = document.getElementById('password1');
    const confirmPassword = document.getElementById('password2');

    function validatePassword() {
        if (password.value != confirmPassword.value) {
            confirmPassword.setCustomValidity("비밀번호가 일치하지 않습니다.");
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    password.onchange = validatePassword;
    confirmPassword.onkeyup = validatePassword;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.textContent = '';

        if (password.value !== confirmPassword.value) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }

        const formData = new FormData(form);

        const jsonData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password1: formData.get('password1'),
            password2: formData.get('password2')
        };

        try {
            // 회원가입 요청
            const registerResponse = await fetch('http://127.0.0.1:8000/accounts/registration/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'http://127.0.0.1:5500'
                },
                body: JSON.stringify(jsonData),
            });
        
            if (!registerResponse.ok) {
                const errorData = await registerResponse.json();
                const errorMessages = Object.entries(errorData)
                    .map(([key, value]) => Array.isArray(value) ? value.join(' ') : value)
                    .join(' ');
                throw new Error(errorMessages);
            }
        
            // 회원가입 성공 후 자동 로그인 요청
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password1')
            };        
        
            const loginResponse = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
            });
        
            if (!loginResponse.ok) {
                alert('로그인 중 오류가 발생했습니다.');
                throw new Error('로그인 중 오류가 발생했습니다.');
            }
        
            const tokens = await loginResponse.json();
            
            // JWT 토큰을 로컬 스토리지에 저장
            localStorage.setItem('jwt_token', tokens.access);

            // 사용자 정보 요청 추가
            const userResponse = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!userResponse.ok) {
                alert('사용자 정보를 가져오는데 실패했습니다.');
                throw new Error('사용자 정보를 가져오는데 실패했습니다.');
            }

            const userData = await userResponse.json();

            // 사용자 정보를 localStorage에 저장
            localStorage.setItem('user', JSON.stringify({
                uuid: userData.id,
                email: userData.email,
                username: userData.username
            }));
        
            alert('회원가입에 성공했습니다!');
            
            window.location.href = '/templates/index.html';
        } catch (error) {
            alert(error.message || '회원가입 중 오류가 발생했습니다.');
            errorMessage.textContent = error.message || '회원가입 중 오류가 발생했습니다.';
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
        const token = localStorage.getItem('access_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    },

    // 로그아웃
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login.html';
    }
};