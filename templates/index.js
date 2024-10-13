document.addEventListener('DOMContentLoaded', function() {
    const postList = document.getElementById('post-list');
    const friendRecommendations = document.getElementById('friend-recommendations');
    const loadMoreFriendsBtn = document.getElementById('load-more-friends');
    let currentPage = 1;
    const postsPerPage = 10;
    let recommendationPage = 1;
    const recommendationsPerPage = 5;
    let allRecommendations = []; // 모든 추천 친구를 저장할 배열

    // CSRF 토큰 가져오기
    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    // 게시물 목록 불러오기
    async function fetchPosts(page = 1) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/insta/posts/?limit=${postsPerPage}&offset=${(page - 1) * postsPerPage}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                console.error('게시물 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('게시물 조회 에러 발생:', error);
            return null;
        }
    }

    // 게시물 표시 함수
    function displayPosts(posts) {
        console.log(posts);

        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('card');
            
            console.log(post.tags);

            postElement.innerHTML = `
                <div class="card-header border-0 pb-0">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <!-- Avatar -->
                            <div class="avatar avatar-story me-2">
                                <a href="#!">
                                    <img class="avatar-img rounded-circle" src="${post.user.profile_image || '/path/to/default/image.jpg'}" alt="${post.user.username}">
                                </a>
                            </div>
                            <!-- Info -->
                            <div>
                                <div class="nav nav-divider">
                                    <h6 class="nav-item card-title mb-0">${post.user.username}</h6>
                                    <span class="nav-item small">${new Date(post.created_at).toLocaleString()}</span>
                                </div>
                                <p class="mb-0 small">${post.location || ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Card body -->
                <div class="card-body post-detail-link" data-post-id="${post.id}">
                    <p>${post.content}</p>
                    <div>
                        <img src="${post.images[0] ? `${API_BASE_URL}${post.images[0]}` : '/path/to/default/image.jpg'}" class="card-img-top" alt="Post image">
                    </div>
                </div>
                <!-- Card feed action START -->
                <!-- 태그 표시 부분 -->
                ${post.tags && post.tags.length > 0 ? `
                    <ul class="nav nav-stack py-3 small ms-4">
                        ${post.tags.replace(/\[|\]|\"/g, '').split(',').map(tag => `
                            <li class="nav-item d-flex justify-content-between">
                                <span class="badge bg-primary me-1">${tag.trim()}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : ''}
                <ul class="nav nav-stack py-3 small ms-4">
                    <li class="nav-item">
                        <a class="nav-link active like-button" href="#!" data-post-id="${post.id}" data-likes-count="${post.likes_count}">
                            <i class="bi bi-hand-thumbs-up-fill pe-1"></i>좋아요 (<span class="likes-count">${post.likes_count}</span>)
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link comment-button" href="#!" data-post-id="${post.id}"> <i class="bi bi-chat-fill pe-1"></i>댓글 (${post.comments.length})
                        </a>
                    </li>
                </ul>
                <!-- Card feed action END -->
                <!-- Comments START -->
                <div class="card-footer border-0 pt-0">
                    <!-- Comment wrap START -->
                    <ul class="comment-wrap list-unstyled">
                        ${post.comments.map(comment => `
                            <li class="comment-item">
                                <div class="d-flex">
                                    <div class="avatar avatar-xs">
                                        <img class="avatar-img rounded-circle" src="${comment.user.profile_image || '/path/to/default/image.jpg'}" alt="${comment.user.username}">
                                    </div>
                                    <div class="ms-2">
                                        <div class="bg-light rounded-start-top-0 p-3 rounded">
                                            <div class="d-flex justify-content-between">
                                                <h6 class="mb-1">${comment.user.username}</h6>
                                                <small class="ms-2">${new Date(comment.created_at).toLocaleString()}</small>
                                            </div>
                                            <p class="small mb-0">${comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                    <!-- Comment wrap END -->
                </div>
                <!-- Comments END -->
            `;
            postList.appendChild(postElement);
        });
    }

    // 친구 추천 불러오기
    async function fetchFriendRecommendations() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/recommend/', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                console.error('친구 추천 조회 실패:', response.status);
                return null;
            }
        } catch (error) {
            console.error('친구 추천 조회 에러 발생:', error);
            return null;
        }
    }

    // 친구 추천 표시
    function displayFriendRecommendations(recommendations) {
        friendRecommendations.innerHTML = ''; // 기존 추천 목록 초기화
        recommendations.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('hstack', 'gap-2', 'mb-3');
            userElement.innerHTML = `
                <div class="avatar">
                    <img class="avatar-img rounded-circle" src="${user.profile_image || '/path/to/default/image.jpg'}" alt="${user.username}">
                </div>
                <div class="overflow-hidden">
                    <a class="h6 mb-0" href="#!">${user.username}</a>
                </div>
                <a class="btn btn-primary-soft rounded-circle icon-md ms-auto follow-btn" href="#" data-user-id="${user.id}"><i class="fa-solid fa-plus"> </i></a>
            `;
            friendRecommendations.appendChild(userElement);
        });
    }

    // 팔로우 기능
    async function followUser(userId) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/accounts/follow/${userId}/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.ok) {
                return true;
            } else {
                console.error('팔로우 실패:', response.status);
                return false;
            }
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
            return false;
        }
    }

    function addEventListeners() {
        // 좋아요 버튼 이벤트
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const postId = e.currentTarget.getAttribute('data-post-id');
                try {
                    const response = await fetch(`http://127.0.0.1:8000/insta/posts/${postId}/like/`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-CSRFToken': getCSRFToken()
                        }
                    });
                    if (response.ok) {
                        const responseData = await response.text();
                        let likeCount;
                        try {
                            likeCount = JSON.parse(responseData);
                        } catch (error) {
                            console.log('서버 응답:', responseData);
                            if (responseData === '') {
                                // 좋아요 취소의 경우, 현재 좋아요 수에서 1을 뺍니다.
                                const currentLikes = parseInt(e.currentTarget.querySelector('.likes-count').textContent);
                                likeCount = Math.max(currentLikes - 1, 0);
                            } else {
                                console.error('서버 응답을 파싱할 수 없습니다:', responseData);
                                return;
                            }
                        }
                        const likesCountElement = e.currentTarget.querySelector('.likes-count');
                        if (likesCountElement) {
                            likesCountElement.textContent = likeCount;
                        }
                        // 좋아요 상태에 따라 버튼 스타일 변경
                        e.currentTarget.classList.toggle('active', likeCount > parseInt(e.currentTarget.getAttribute('data-likes-count')));
                        e.currentTarget.setAttribute('data-likes-count', likeCount);
                    } else {
                        console.error('좋아요 요청 실패:', response.status);
                    }
                } catch (error) {
                    console.error('좋아요 처리 중 오류 발생:', error);
                }
            });
        });

        // 팔로우 버튼 이벤트
        document.querySelectorAll('.follow-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const userId = e.currentTarget.getAttribute('data-user-id');
                try {
                    const success = await followUser(userId);
                    if (success) {
                        const followBtn = e.currentTarget;
                        if (followBtn) {
                            followBtn.innerHTML = '<i class="fa-solid fa-check"> </i>';
                            followBtn.classList.remove('btn-primary-soft');
                            followBtn.classList.add('btn-success');
                            followBtn.disabled = true;
                        } else {
                            console.error('팔로우 버튼을 찾을 수 없습니다.');
                        }
                    }
                } catch (error) {
                    console.error('팔로우 처리 중 오류 발생:', error);
                }
            });
        });

        // 포스트 상세 페이지로 이동 (포스트 내용 클릭 시)
        document.querySelectorAll('.post-detail-link').forEach(element => {
            element.addEventListener('click', (e) => {
                const postId = e.currentTarget.getAttribute('data-post-id');
                window.location.href = `/templates/post-detail.html?id=${postId}`;
            });
        });

        // 댓글 버튼 클릭 시 상세 페이지로 이동
        document.querySelectorAll('.comment-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = e.currentTarget.getAttribute('data-post-id');
                window.location.href = `/templates/post-detail.html?id=${postId}#comments`;
            });
        });
    }

    // 초기 로드
    async function init() {
        const initialPosts = await fetchPosts();
        if (initialPosts && initialPosts.results) {
            displayPosts(initialPosts.results);
        }

        allRecommendations = await fetchFriendRecommendations();
        if (allRecommendations && allRecommendations.length > 0) {
            displayFriendRecommendations(allRecommendations.slice(0, recommendationsPerPage));
            addEventListeners();
        } else {
            friendRecommendations.innerHTML = '<p>추천할 친구가 없습니다.</p>';
            loadMoreFriendsBtn.style.display = 'none';
        }
    }

    // 더 보기 버튼 이벤트
    loadMoreFriendsBtn.addEventListener('click', () => {
        recommendationPage++;
        const startIndex = (recommendationPage - 1) * recommendationsPerPage;
        const endIndex = startIndex + recommendationsPerPage;
        const moreRecommendations = allRecommendations.slice(startIndex, endIndex);
        
        if (moreRecommendations.length > 0) {
            displayFriendRecommendations([...friendRecommendations.querySelectorAll('.hstack'), ...moreRecommendations]);
            addEventListeners();
        }
        
        if (endIndex >= allRecommendations.length) {
            loadMoreFriendsBtn.style.display = 'none';
        }
    });

    // 스크롤 이벤트를 통한 무한 스크롤 구현
    window.addEventListener('scroll', async () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
            currentPage++;
            const morePosts = await fetchPosts(currentPage);
            if (morePosts && morePosts.results && morePosts.results.length > 0) {
                displayPosts(morePosts.results);
                addEventListeners();
            }
        }
    });

    init();
});
