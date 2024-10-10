document.addEventListener('DOMContentLoaded', function() {
    const userInfo = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    const usernameSpan = document.getElementById('username');
    const profileLink = document.getElementById('profile-link');
    const logoutBtn = document.getElementById('logout-btn');
    const postList = document.getElementById('post-list');
    const friendRecommendations = document.getElementById('friend-recommendations');

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

    // 친구 추천 목록 불러오기
    async function loadFriendRecommendations() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/recommend/', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const recommendationsData = await response.json();
                displayFriendRecommendations(recommendationsData);
            } else {
                console.error('친구 추천 목록 불러오기 실패');
                friendRecommendations.innerHTML = '<p>친구 추천 목록을 불러오는데 실패했습니다.</p>';
            }
        } catch (error) {
            console.error('친구 추천 목록 불러오기 중 오류 발생:', error);
            friendRecommendations.innerHTML = '<p>친구 추천 목록을 불러오는데 실패했습니다.</p>';
        }
    }

    // 친구 추천 표시
    function displayFriendRecommendations(recommendations) {
        friendRecommendations.innerHTML = '';
        if (recommendations && recommendations.length > 0) {
            recommendations.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'friend-recommendation';
                userElement.innerHTML = `
                    <img src="${user.profile_image || '/path/to/default/image.jpg'}" alt="${user.username}" style="width: 50px; height: 50px; border-radius: 50%;">
                    <span>${user.username}</span>
                    <button class="follow-btn" data-user-id="${user.id}">팔로우</button>
                `;
                friendRecommendations.appendChild(userElement);
            });
            addFollowButtonListeners();
        } else {
            friendRecommendations.innerHTML = '<p>추천할 친구가 없습니다.</p>';
        }
    }

    // 팔로우 버튼에 이벤트 리스너 추가
    function addFollowButtonListeners() {
        const followButtons = document.querySelectorAll('.follow-btn');
        followButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const userId = this.getAttribute('data-user-id');
                try {
                    const response = await fetch(`http://127.0.0.1:8000/accounts/follow/${userId}/`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-CSRFToken': getCSRFToken()
                        }
                    });

                    if (response.ok) {
                        this.textContent = '팔로잉';
                        this.disabled = true;
                    } else {
                        console.error('팔로우 실패');
                    }
                } catch (error) {
                    console.error('팔로우 중 오류 발생:', error);
                }
            });
        });
    }

    // 초기 실행
    async function init() {
        await checkAuth();
        loadPosts();
        if (userInfo.style.display === 'block') {
            loadFriendRecommendations();
        }
    }

    init();
});
