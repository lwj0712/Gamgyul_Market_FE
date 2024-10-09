document.addEventListener('DOMContentLoaded', function() {
    const userInfo = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    const usernameSpan = document.getElementById('username');
    const profileLink = document.getElementById('profile-link');
    const logoutBtn = document.getElementById('logout-btn');
    const postList = document.getElementById('post-list');

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
                userInfo.style.display = 'block';
                loginLink.style.display = 'none';
                usernameSpan.textContent = userData.username;
                profileLink.href = `/templates/profile.html?username=${userData.username}`;
            } else {
                userInfo.style.display = 'none';
                loginLink.style.display = 'block';
            }
        } catch (error) {
            console.error('인증 확인 중 오류 발생:', error);
            userInfo.style.display = 'none';
            loginLink.style.display = 'block';
        }
        // 인증 상태와 관계없이 게시물을 로드합니다.
        loadPosts();
    }

    // 게시물 목록 불러오기
    async function loadPosts() {
        try {
            const response = await fetch('http://127.0.0.1:8000/insta/posts/', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const postsData = await response.json();
                displayPosts(postsData.results);
            } else {
                console.error('게시물 불러오기 실패');
                postList.innerHTML = '<p>게시물을 불러오는데 실패했습니다.</p>';
            }
        } catch (error) {
            console.error('게시물 불러오기 중 오류 발생:', error);
            postList.innerHTML = '<p>게시물을 불러오는데 실패했습니다.</p>';
        }
    }

    // 게시물 표시
    function displayPosts(posts) {
        postList.innerHTML = '';
        if (posts && posts.length > 0) {
            posts.forEach(post => {
                const postElement = document.createElement('article');
                postElement.innerHTML = `
                    <h2>${post.user.username}</h2>
                    <p>${post.content}</p>
                    ${post.images && post.images.length > 0 ? `<img src="${post.images[0]}" alt="Post image" style="max-width: 100%;">` : ''}
                    <p>좋아요: ${post.likes_count}</p>
                `;
                postList.appendChild(postElement);
            });
        } else {
            postList.innerHTML = '<p>표시할 게시물이 없습니다.</p>';
        }
    }

    // 로그아웃
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const response = await fetch('http://127.0.0.1:8000/accounts/logout/', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'X-CSRFToken': getCSRFToken()
                    }
                });
        
                if (response.ok) {
                    window.location.reload();
                } else {
                    console.error('로그아웃 실패');
                }
            } catch (error) {
                console.error('로그아웃 중 오류 발생:', error);
            }
        });
    }

    // CSRF 토큰 가져오기
    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    // 초기 실행
    checkAuth();
});