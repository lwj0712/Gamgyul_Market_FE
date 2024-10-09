document.addEventListener('DOMContentLoaded', function() {
    const profileImage = document.getElementById('profile-image');
    const usernameElement = document.getElementById('username');
    const bioElement = document.getElementById('bio');
    const followersCountElement = document.getElementById('followers-count');
    const followingCountElement = document.getElementById('following-count');
    const followBtn = document.getElementById('follow-btn');
    const followersListSection = document.getElementById('followers-list');
    const followingListSection = document.getElementById('following-list');
    const followersList = document.getElementById('followers');
    const followingList = document.getElementById('following');
    const productList = document.getElementById('product-list');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    async function loadProfile() {
        try {
            const response = await fetch(`http://127.0.0.1:8000/accounts/profile/${username}/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                updateProfileUI(profileData);
            } else if (response.status === 401) {
                // 인증되지 않은 사용자
                loginLink.style.display = 'inline';
                logoutBtn.style.display = 'none';
            } else {
                console.error('프로필 로드 실패');
            }
        } catch (error) {
            console.error('프로필 로드 중 오류 발생:', error);
        }
    }

    function updateProfileUI(profileData) {
        profileImage.src = profileData.profile_image || '/path/to/default/image.jpg';
        usernameElement.textContent = profileData.username;
        bioElement.textContent = profileData.bio || '소개가 없습니다.';
        followersCountElement.textContent = profileData.followers_count;
        followingCountElement.textContent = profileData.following_count;

        // 팔로워 목록
        if (profileData.followers) {
            followersListSection.style.display = 'block';
            followersList.innerHTML = profileData.followers.map(follower => 
                `<li>${follower.username}</li>`
            ).join('');
        }

        // 팔로잉 목록
        if (profileData.following) {
            followingListSection.style.display = 'block';
            followingList.innerHTML = profileData.following.map(following => 
                `<li>${following.username}</li>`
            ).join('');
        }

        // 상품 목록
        if (profileData.products) {
            productList.innerHTML = profileData.products.map(product => 
                `<li>${product.name} - ${product.price}</li>`
            ).join('');
        }

        // 팔로우 버튼 표시 (자기 자신의 프로필이 아닐 경우)
        if (profileData.username !== localStorage.getItem('username')) {
            followBtn.style.display = 'block';
        }

        loginLink.style.display = 'none';
        logoutBtn.style.display = 'inline';
    }

    followBtn.addEventListener('click', async function() {
        try {
            const response = await fetch(`http://127.0.0.1:8000/accounts/follow/${username}/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                loadProfile(); // 프로필 정보 새로고침
            } else {
                console.error('팔로우 실패');
            }
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
        }
    });

    logoutBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/logout/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                localStorage.removeItem('username');
                window.location.href = '/templates/login.html';
            } else {
                console.error('로그아웃 실패');
            }
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
        }
    });

    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    loadProfile();
});