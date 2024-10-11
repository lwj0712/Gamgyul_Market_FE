document.addEventListener('DOMContentLoaded', function() {
    const userInfo = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    const usernameSpan = document.getElementById('username');
    const profileLink = document.getElementById('profile-link');
    const logoutBtn = document.getElementById('logout-btn');
    const postList = document.getElementById('post-list');
    const friendRecommendations = document.getElementById('friend-recommendations');
    const profileImage = document.getElementById('profile-image');
    const profilePicUrl = '';

    // profileImage가 있는 경우에만 관련 작업 수행
    if (profileImage) {
        profileImage.src = profilePicUrl;
    }

    // 사용자 인증
    async function checkAuth() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();
                console.log(userData);

                // 사용자 정보 표시
                if (userInfo) {
                    userInfo.style.display = 'block';
                }
                // 로그인 링크 숨기기
                if (loginLink) {
                    loginLink.style.display = 'none';
                }
                // 사용자 이름 업데이트
                if (usernameSpan) {
                    usernameSpan.textContent = userData.username;
                }

                // profileLink의 href를 사용자 이름이 있을 경우에만 설정
                if (profileLink) { // profileLink가 null이 아닐 경우에만 href 설정
                    profileLink.href = `/templates/profile.html?username=${userData.username}`;
                }

                // profileImage.src = userData.profile_image || '/path/to/default/image.jpg';

                // 로그아웃 버튼 표시
                if (logoutBtn) {
                    logoutBtn.style.display = 'block';
                }
            } else {
                // 사용자 정보 숨기기
                if (userInfo) {
                    userInfo.style.display = 'none';
                }
                // 로그인 링크 보이기
                if (loginLink) {
                    loginLink.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('인증 확인 중 오류 발생:', error); // 오류 처리 추가
            if (userInfo) {
                userInfo.style.display = 'none'; // 사용자 정보 숨기기
            }
            if (loginLink) {
                loginLink.style.display = 'block'; // 로그인 링크 보이기
            }
        }
    }
    
    // 인증 확인 함수 호출
    checkAuth();
});

// CSRF 토큰을 가져오는 함수 정의
function getCSRFToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';
}
