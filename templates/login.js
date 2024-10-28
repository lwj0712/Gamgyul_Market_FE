// Constants
const API_BASE_URL = 'http://127.0.0.1:8000';
const GOOGLE_CLIENT_ID = '794898515305-u193grbieboe2mtotlqsi6r1c3olqdvb.apps.googleusercontent.com'; // Google Cloud Console에서 받은 클라이언트 ID

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

// Google OAuth URL 생성 함수
function getGoogleOAuthURL() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
        redirect_uri:'http://127.0.0.1:5500/templates/google-callback.html',
        client_id: GOOGLE_CLIENT_ID,
        response_type: 'token',  // token으로 변경
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid'
        ].join(' ')
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
}

// 콜백 페이지의 handleGoogleCallback 함수
async function handleGoogleCallback() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (!accessToken) {
        alert('Google 로그인에 실패했습니다.');
        window.location.href = '/templates/login.html';
        return;
    }

    try {
        // 백엔드에 Google access token 전송
        const response = await fetch('http://127.0.0.1:8000/accounts/google/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token: accessToken })
        });

        if (!response.ok) {
            throw new Error('소셜 로그인 처리 실패');
        }

        const data = await response.json();
        
        // JWT 토큰 저장
        localStorage.setItem('jwt_token', data.access_token);

        // 사용자 정보 요청 및 저장
        const userResponse = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
            headers: {
                'Authorization': `Bearer ${data.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            localStorage.setItem('user', JSON.stringify(userData));
            window.location.href = '/templates/index.html';
        }
    } catch (error) {
        console.error('Google 로그인 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
        window.location.href = '/templates/login.html';
    }
}

// 로그인 페이지 초기화
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const googleLoginBtn = document.getElementById('google-login');
    const errorMessage = document.getElementById('error-message');

    // 이미 로그인된 상태라면 메인 페이지로 리다이렉트
    if (getJWTToken() && localStorage.getItem('user')) {
        window.location.href = '/templates/index.html';
        return;
    }

    // Google 로그인 버튼 이벤트 리스너
    googleLoginBtn.addEventListener('click', function() {
        window.location.href = getGoogleOAuthURL();
    });

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