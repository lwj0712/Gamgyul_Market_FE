document.addEventListener('DOMContentLoaded', function() {
    const postList = document.getElementById('post-list');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const friendRecommendations = document.getElementById('friend-recommendations');
    const loadMoreFriendsBtn = document.getElementById('load-more-friends');
    let currentPage = 1;
    const postsPerPage = 10;
    let recommendationPage = 1;
    const recommendationsPerPage = 5;
    let allRecommendations = []; // 모든 추천 친구를 저장할 배열

    // JWT 토큰 관리 함수들
    function getJWTToken() {
        return localStorage.getItem('jwt_token');
    }

    function setJWTToken(token) {
        localStorage.setItem('jwt_token', token);
    }

    function removeJWTToken() {
        localStorage.removeItem('jwt_token');
    }

    // API 요청에 사용할 기본 헤더
    function getAuthHeaders() {
        const token = getJWTToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // API 요청 wrapper 함수
    async function authenticatedFetch(url, options = {}) {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            // 토큰이 만료되었거나 유효하지 않은 경우
            if (response.status === 401) {
                removeJWTToken();
                window.location.href = '/templates/login.html';
                return null;
            }

            return response;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    // 게시물 목록 불러오기
    async function fetchPosts(page = 1) {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/posts/posts/?limit=${postsPerPage}&offset=${(page - 1) * postsPerPage}`,
                { method: 'GET' }
            );
    
            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('게시물 조회 에러 발생:', error);
            return null;
        }
    }

    function displayPosts(posts) {
        console.log(posts);
    
        posts.forEach(async post => {
            const postElement = document.createElement('div');
            postElement.classList.add('card');
            
            const comments = await fetchComments(post.id);
            const commentsCount = comments ? comments.length : 0;
            // 좋아요 상태에 따른 클래스와 색상 설정
            const isLiked = post.is_liked ? 'active text-primary' : '';

            // 좋아요 상태에 따른 스타일 설정
            const likeButtonStyle = post.is_liked 
                ? `color: #0d6efd; font-weight: bold;` 
                : `color: #666;`;
            const likeIconStyle = post.is_liked 
                ? `color: #0d6efd;` 
                : `color: #666;`;
            const likeText = post.is_liked ? '좋아요 취소' : '좋아요';

            // 이미지 URL 처리 로직 수정
            const imageUrl = post.images && post.images.length > 0
            ? post.images[0]  // S3 URL을 직접 사용
            : '/templates/images/placeholder.jpg';

            postElement.innerHTML = `
                <div class="card-header border-0 pb-0">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <!-- Avatar -->
                            <div class="avatar avatar-story me-2">
                                <a href="#!">
                                    <img class="avatar-img rounded-circle" src="${post.user.profile_image || '/templates/images/placeholder.jpg'}" alt="${post.user.username}">
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
                    ${post.images && post.images.length > 0 ? `
                        <div>
                            <img src="${imageUrl}" 
                                 class="card-img-top" 
                                 alt="Post image"
                                 onerror="this.src='/templates/images/placeholder.jpg'"
                            >
                        </div>
                    ` : ''}
                </div>
                <!-- Card feed action START -->
                <!-- 태그 표시 부분 -->
                ${post.tags ? `
                    <ul class="nav nav-stack py-3 small d-flex flex-row ms-4">
                        ${parseTags(post.tags)
                            .map(tag => `
                                <li class="nav-item me-1">
                                    <span class="badge bg-primary fs-6">${tag.trim()}</span>
                                </li>
                            `).join('')}
                    </ul>
                ` : ''}
                <ul class="nav nav-stack py-3 small ms-4">
                    <li class="nav-item">
                        <a class="nav-link like-button ${post.is_liked ? 'active text-primary' : ''}" 
                           href="#!" 
                           data-post-id="${post.id}" 
                           data-likes-count="${post.likes_count || 0}"
                           data-is-liked="${post.is_liked || false}"
                           style="${likeButtonStyle}">
                            <i class="bi bi-hand-thumbs-up-fill pe-1" style="${likeIconStyle}"></i>
                            <span class="like-text">${likeText}</span> 
                            (<span class="likes-count">${post.likes_count || 0}</span>)
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link comment-button" href="#!" data-post-id="${post.id}">
                            <i class="bi bi-chat-fill pe-1"></i>댓글 (${commentsCount})
                        </a>
                    </li>
                </ul>
            `;
            postList.appendChild(postElement);
        });

        addEventListeners();
    }

    // 태그 처리 함수
    function parseTags(tags) {
        if (!tags || !tags.length) return [];
        try {
            return JSON.parse(tags[0]);
        } catch (error) {
            console.error('태그 파싱 중 오류 발생:', error);
            return [];
        }
    }

    // 태그로 게시물 검색
    async function fetchPostsByTags(tags) {
        try {
            const tagParams = tags.map(tag => `tags=${encodeURIComponent(tag)}`).join('&');
            const response = await authenticatedFetch(
                `${API_BASE_URL}/search/search-post/?${tagParams}`,
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('태그로 게시물 조회 중 에러 발생:', error);
            return null;
        }
    }

    // 검색 버튼 이벤트 핸들러
    searchButton.addEventListener('click', async () => {
        const tags = searchInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tags.length > 0) {
            const posts = await fetchPostsByTags(tags);
            if (posts && posts.results) {
                displayPosts(posts.results);
            } else {
                postList.innerHTML = '<p>검색 결과가 없습니다.</p>';
            }
        } else {
            alert('적어도 하나의 태그를 입력해주세요.');
        }
    });


    // 친구 추천 불러오기
    async function fetchFriendRecommendations() {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/recommendations/recommend/`,
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
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
                    <img class="avatar-img rounded-circle" src="${user.profile_image || '/templates/images/placeholder.jpg'}" alt="${user.username}">
                </div>
                <div class="overflow-hidden">
                    <a class="h6 mb-0" href="#!">${user.username}</a>
                </div>
                <a class="btn btn-primary-soft rounded-circle icon-md ms-auto follow-btn" href="#" data-user-id="${user.id}"><i class="fa-solid fa-plus"> </i></a>
            `;
            friendRecommendations.appendChild(userElement);
        });
    }

    // 댓글 목록 조회 함수 추가
    async function fetchComments(postId) {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/comments/posts/${postId}/comments/`,
                { method: 'GET' }
            );

            if (response && response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            console.error('댓글 조회 중 오류 발생:', error);
            return null;
        }
    }

    // 팔로우 기능
    async function followUser(userId) {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/follow/follow/${userId}/`,
                { method: 'POST' }
            );

            return response && response.ok;
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
            return false;
        }
    }

    // 좋아요 기능
    async function likePost(postId) {
        try {
            const response = await authenticatedFetch(
                `${API_BASE_URL}/likes/posts/${postId}/like/`,
                { method: 'POST' }
            );
        
            if (response && response.ok) {
                // 응답 내용이 있는지 먼저 확인
                const text = await response.text();
                if (!text) {
                    // 응답이 비어있는 경우, 현재 버튼의 상태를 반전시켜 반환
                    return {
                        likes_count: parseInt(document.querySelector(`[data-post-id="${postId}"] .likes-count`).textContent) - 1,
                        is_liked: false
                    };
                }
                
                // JSON 파싱 시도
                try {
                    const data = JSON.parse(text);
                    return {
                        likes_count: data.likes_count,
                        is_liked: data.is_liked
                    };
                } catch (parseError) {
                    console.error('JSON 파싱 에러:', parseError);
                    return {
                        likes_count: parseInt(document.querySelector(`[data-post-id="${postId}"] .likes-count`).textContent) - 1,
                        is_liked: false
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('좋아요 처리 중 오류 발생:', error);
            return null;
        }
    }

    // 이벤트 리스너를 한 번만 등록하도록 수정
    function addEventListeners() {
        // 이미 이벤트 리스너가 등록되어 있는지 확인하는 플래그 추가
        if (window.isEventListenerAdded) return;

        document.addEventListener('click', handleClick);
        window.isEventListenerAdded = true;
    }

    // 클릭 이벤트 핸들러 함수
    async function handleClick(e) {
        // 좋아요 버튼 클릭 처리
        if (e.target.closest('.like-button')) {
            e.preventDefault();
            const button = e.target.closest('.like-button');
            
            // 이미 처리 중인 경우 중복 클릭 방지
            if (button.dataset.processing === 'true') return;
            
            try {
                button.dataset.processing = 'true';
                
                const postId = button.getAttribute('data-post-id');
                const result = await likePost(postId);
                
                if (result !== null) {
                    // 좋아요 수 업데이트
                    const likesCountElement = button.querySelector('.likes-count');
                    if (likesCountElement) {
                        likesCountElement.textContent = result.likes_count;
                    }
                    
                    // 좋아요 텍스트 업데이트
                    const likeTextElement = button.querySelector('.like-text');
                    if (likeTextElement) {
                        likeTextElement.textContent = result.is_liked ? '좋아요 취소' : '좋아요';
                    }
                    
                    // 버튼 스타일 업데이트
                    button.style.color = result.is_liked ? '#0d6efd' : '#666';
                    button.style.fontWeight = result.is_liked ? 'bold' : 'normal';
                    
                    // 아이콘 색상 업데이트
                    const icon = button.querySelector('.bi-hand-thumbs-up-fill');
                    if (icon) {
                        icon.style.color = result.is_liked ? '#0d6efd' : '#666';
                    }
                    
                    // 클래스 토글
                    button.classList.toggle('active', result.is_liked);
                    button.classList.toggle('text-primary', result.is_liked);
                    
                    // 데이터 속성 업데이트
                    button.setAttribute('data-is-liked', result.is_liked);
                    
                    // 시각적 피드백
                    showToast(result.is_liked ? '게시물을 좋아합니다.' : '좋아요를 취소했습니다.');
                }
            } finally {
                button.dataset.processing = 'false';
            }
        }

        // 팔로우 버튼 클릭 처리
        if (e.target.closest('.follow-btn')) {
            e.preventDefault();
            const button = e.target.closest('.follow-btn');
            const userId = button.getAttribute('data-user-id');
            const success = await followUser(userId);

            if (success) {
                button.innerHTML = '<i class="fa-solid fa-check"> </i>';
                button.classList.remove('btn-primary-soft');
                button.classList.add('btn-success');
                button.disabled = true;
            }
        }

        // 게시물 상세 페이지로 이동
        if (e.target.closest('.post-detail-link')) {
            const element = e.target.closest('.post-detail-link');
            const postId = element.getAttribute('data-post-id');
            window.location.href = `/templates/post-detail.html?id=${postId}`;
        }

        // 댓글 버튼 클릭 시 상세 페이지로 이동
        if (e.target.closest('.comment-button')) {
            e.preventDefault();
            const button = e.target.closest('.comment-button');
            const postId = button.getAttribute('data-post-id');
            window.location.href = `/templates/post-detail.html?id=${postId}#comments`;
        }
    }

    // 모든 이벤트 리스너 제거 함수 추가
    function removeEventListeners() {
        document.removeEventListener('click', handleClick);
        window.isEventListenerAdded = false;
    }

    // 초기 로드
    async function init() {
        // JWT 토큰이 없으면 로그인 페이지로 리다이렉트
        if (!getJWTToken()) {
            window.location.href = '/templates/login.html';
            return;
        }

        const initialPosts = await fetchPosts(); // 모든 게시물 가져오기
        if (initialPosts && initialPosts.results) {
            displayPosts(initialPosts.results);
        }
    
        // 친구 추천 목록 불러오기
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
        const moreRecommendations = allRecommendations.slice(0, endIndex); // 처음부터 현재 페이지까지의 모든 추천
        
        if (moreRecommendations.length > 0) {
            displayFriendRecommendations(moreRecommendations);
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
