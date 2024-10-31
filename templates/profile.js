document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const USERS_TO_SHOW = 5;

    // DOM Elements
    const profileImage = document.getElementById('profile-image');
    const usernameElement = document.getElementById('username');
    const bioElement = document.getElementById('bio');
    const followersCountElement = document.getElementById('followers-count');
    const followingCountElement = document.getElementById('following-count');
    const followBtn = document.getElementById('follow-btn');
    const followersList = document.getElementById('followers');
    const followingList = document.getElementById('following');
    const productList = document.getElementById('product-list');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileSettingsBtn = document.getElementById('profile-settings-btn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const postList = document.getElementById('post-list');

    let allFollowers = [];
    let allFollowing = [];

    // 맨 위 Constants 아래에 추가
    function getProfileIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const uuid = urlParams.get('uuid');
        console.log('URL UUID:', uuid); // URL 파라미터 로그
        return uuid;
    }
    
    // loadProfile 함수도 수정
    async function loadProfile() {
        try {
            const urlUuid = getProfileIdFromUrl();
            const currentUser = getCurrentUser();
            
            console.log('URL UUID:', urlUuid);
            console.log('Current User:', currentUser);
            
            // URL에 uuid가 있으면 그것을 사용, 없으면 현재 로그인한 사용자의 id 사용
            const uuid = urlUuid || (currentUser ? currentUser.id : null);
            
            console.log('Selected UUID for profile load:', uuid);
            
            if (!uuid) {
                console.log('No UUID found, redirecting to login');
                window.location.href = '/templates/login.html';
                return;
            }
        
            const response = await fetchWithAuth(`${API_BASE_URL}/profiles/profile/${uuid}/`);
            if (response.ok) {
                const profileData = await response.json();
                console.log('Profile Data:', profileData);
                updateProfileUI(profileData);
            } else {
                console.error('Profile load failed with status:', response.status);
                throw new Error('프로필 로드 실패');
            }
        } catch (error) {
            console.error('프로필 로드 중 오류 발생:', error);
            showErrorMessage('프로필을 불러오는 데 실패했습니다.');
        }
    }

    // updateProfileUI에서 사용
    function updateProfileUI(profileData) {
        if (profileImage) profileImage.src = getFullImageUrl(profileData.profile_image);
        if (usernameElement) usernameElement.textContent = profileData.username;
        if (bioElement) bioElement.textContent = profileData.bio || '아직 소개가 없습니다.';
        if (followersCountElement) followersCountElement.textContent = profileData.followers_count || 0;
        if (followingCountElement) followingCountElement.textContent = profileData.following_count || 0;

        // 메인 팔로우 버튼 설정
        if (followBtn) {
            if (!profileData.is_self) {
                followBtn.style.display = 'inline';
                // 통일된 함수 사용
                updateFollowButton(followBtn, profileData.is_following, profileData.id);
            } else {
                followBtn.style.display = 'none';
            }
        }

        updateEmailDisplay(profileData);
        renderFollowersList(profileData.followers || []);
        renderFollowingList(profileData.following || []);
        renderPostList(profileData.posts || []);
        renderProductList(profileData.products || []);
        updateProfileButtons(profileData.is_self);
    }

    function updateEmailDisplay(profileData) {
        const emailElement = document.getElementById('email-address');
        const emailContainer = document.getElementById('email');
        if (emailElement && emailContainer) {
            if (profileData.email && (profileData.is_self || profileData.show_email)) {
                emailElement.textContent = profileData.email;
                emailContainer.style.display = 'block';
            } else {
                emailContainer.style.display = 'none';
            }
        }
    }

    function updateProfileButtons(isSelf) {
        if (isSelf) {
            if (followBtn) followBtn.style.display = 'none';
            if (editProfileBtn) editProfileBtn.style.display = 'inline';
            if (profileSettingsBtn) profileSettingsBtn.style.display = 'inline';
        } else {
            if (editProfileBtn) editProfileBtn.style.display = 'none';
            if (profileSettingsBtn) profileSettingsBtn.style.display = 'none';
        }
    }

    // Followers/Following Functions
    function renderFollowersList(followers) {
        if (!Array.isArray(followers)) return;
        allFollowers = followers;
        updateFollowersList();
    }
    
    function renderFollowingList(following) {
        if (!Array.isArray(following)) return;
        allFollowing = following;
        updateFollowingList();
    }

    function updateFollowersList(showAll = false) {
        if (!followersList) return;
        const followersToShow = showAll ? allFollowers : allFollowers.slice(0, USERS_TO_SHOW);
        followersList.innerHTML = followersToShow.map(follower => createUserListItem(follower, 'follower')).join('');
        
        const showMoreFollowersBtn = document.getElementById('show-more-followers');
        if (showMoreFollowersBtn) {
            showMoreFollowersBtn.style.display = allFollowers.length > USERS_TO_SHOW ? (showAll ? 'none' : 'block') : 'none';
        }
    }

    function updateFollowingList(showAll = false) {
        if (!followingList) return;
        const followingToShow = showAll ? allFollowing : allFollowing.slice(0, USERS_TO_SHOW);
        followingList.innerHTML = followingToShow.map(following => createUserListItem(following, 'following')).join('');
        
        const showMoreFollowingBtn = document.getElementById('show-more-following');
        if (showMoreFollowingBtn) {
            showMoreFollowingBtn.style.display = allFollowing.length > USERS_TO_SHOW ? (showAll ? 'none' : 'block') : 'none';
        }
    }

    // 사용자 비교 시에도 id 사용하도록 수정
    function createUserListItem(user, type) {
        const currentUser = getCurrentUser();
        const isCurrentUser = currentUser && user.id === currentUser.id;

        return `
            <li class="list-group-item d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                     <img src="${getFullImageUrl(user.profile_image)}" alt="${user.username}" class="avatar-img rounded-circle" style="width: 40px; height: 40px;">
                    <div class="ms-3">
                        <h6 class="mb-0">${user.username}${isCurrentUser ? ' (나)' : ''}</h6>
                    </div>
                </div>
                <div>
                    ${!isCurrentUser ? `
                        <button class="btn btn-sm ${type === 'following' ? 'btn-danger-soft unfollow-btn' : 'btn-success-soft follow-btn'}" data-user-uuid="${user.id}">
                            ${type === 'following' ? '언팔로우' : '팔로우'}
                        </button>
                    ` : ''}
                </div>
            </li>
        `;
    }

    // handleFollow에서 사용
    async function handleFollow(event) {
        try {
            const userId = event.target.getAttribute('data-user-uuid');
            if (!userId) {
                throw new Error('사용자 ID를 찾을 수 없습니다.');
            }

            const response = await fetchWithAuth(`${API_BASE_URL}/follow/follow/${userId}/`, 'POST');

            if (response.ok) {
                const data = await response.json();
                // 통일된 함수 사용
                updateFollowButton(event.target, true);
                if (followersCountElement) {
                    followersCountElement.textContent = data.followers_count || 0;
                }
                if (followingCountElement) {
                    followingCountElement.textContent = data.following_count || 0;
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || '팔로우 실패');
            }
            loadProfile();
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
            showErrorMessage('팔로우 처리 중 오류가 발생했습니다.');
        }
    }

    // handleUnfollow에서 사용
    async function handleUnfollow(event) {
        try {
            const userId = event.target.getAttribute('data-user-uuid');
            if (!userId) {
                throw new Error('사용자 ID를 찾을 수 없습니다.');
            }

            const response = await fetchWithAuth(`${API_BASE_URL}/follow/unfollow/${userId}/`, 'DELETE');

            if (response.ok) {
                const data = await response.json();
                // 통일된 함수 사용
                updateFollowButton(event.target, false);
                if (followersCountElement) {
                    followersCountElement.textContent = data.followers_count || 0;
                }
                if (followingCountElement) {
                    followingCountElement.textContent = data.following_count || 0;
                }
                loadProfile();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || '언팔로우 실패');
            }
        } catch (error) {
            console.error('언팔로우 중 오류 발생:', error);
            showErrorMessage('언팔로우 처리 중 오류가 발생했습니다.');
        }
    }

    // 통일된 버튼 업데이트 함수
    function updateFollowButton(button, isFollowing, userId = null) {
        if (!button) return;

        // userId가 제공된 경우에만 설정
        if (userId) {
            button.setAttribute('data-user-uuid', userId);
        }

        if (isFollowing) {
            button.textContent = '언팔로우';
            button.classList.remove('btn-primary', 'follow-btn', 'btn-success-soft');
            button.classList.add('btn-danger-soft', 'unfollow-btn');
        } else {
            button.textContent = '팔로우';
            button.classList.remove('btn-danger-soft', 'unfollow-btn');
            button.classList.add('btn-primary', 'follow-btn', 'btn-success-soft');
        }
    }

    // Post and Product Functions
    async function renderPostList(posts) {
        if (!postList) return;
        if (posts && posts.length > 0) {
            // 모든 포스트의 댓글을 가져오는 Promise 배열 생성
            const postsWithComments = await Promise.all(posts.map(async post => {
                try {
                    const response = await fetchWithAuth(`${API_BASE_URL}/comments/posts/${post.id}/comments/`);
                    if (!response.ok) throw new Error('Failed to fetch comments');
                    const comments = await response.json();
                    return {
                        ...post,
                        commentsCount: comments ? comments.length : 0
                    };
                } catch (error) {
                    console.error('Error fetching comments for post:', post.id, error);
                    return {
                        ...post,
                        commentsCount: 0
                    };
                }
            }));
    
            postList.innerHTML = postsWithComments.map(post => {
                const images = post.images || [];
                const imageUrl = images.length > 0 ? getFullImageUrl(images[0]) : DEFAULT_PROFILE_IMAGE;
    
                return `
                    <div class="col-sm-6 col-lg-4">
                        <div class="card h-100 post-card" 
                             data-post-id="${post.id}" 
                             style="cursor: pointer; transition: transform 0.2s;">
                            <div class="position-relative">
                                <img src="${imageUrl}" class="card-img-top" alt="게시물 이미지">
                            </div>
                            <div class="card-body">
                                <h5 class="card-title">${post.content ? post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '') : '내용 없음'}</h5>
                                <p class="small"><i class="bi bi-calendar-event me-2"></i>${new Date(post.created_at).toLocaleDateString()}</p>
                                <ul class="nav nav-stack py-3 small">
                                    <li class="nav-item">
                                        <i class="bi bi-heart-fill me-1"></i>${post.likes_count || 0}
                                    </li>
                                    <li class="nav-item ms-sm-auto">
                                        <i class="bi bi-chat-left-text-fill me-1"></i>${post.commentsCount}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add hover effect with CSS
            const style = document.createElement('style');
            style.textContent = `
                .post-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
            `;
            document.head.appendChild(style);

            // Add click event listeners to all post cards
            const postCards = postList.querySelectorAll('.post-card');
            postCards.forEach(card => {
                card.addEventListener('click', () => {
                    const postId = card.getAttribute('data-post-id');
                    window.location.href = `/templates/post-detail.html?id=${postId}`;
                });
            });
        } else {
            postList.innerHTML = '<p class="col-12">등록된 게시물이 없습니다.</p>';
        }
    }

    function renderProductList(products) {
        if (!productList) return;
        if (products && products.length > 0) {
            productList.innerHTML = products.map(product => `
                <div class="card mb-3 product-card" 
                     data-product-id="${product.id}"
                     style="cursor: pointer; transition: transform 0.2s;">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${getFullImageUrl(product.images[0])}" 
                                 class="img-fluid rounded-start" 
                                 alt="${product.name}">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text">가격: ${product.price}</p>
                                <p class="card-text">재고: ${product.stock}</p>
                                <p class="card-text">품종: ${product.variety}</p>
                                <p class="card-text">재배 지역: ${product.growing_region}</p>
                                <p class="card-text">수확일: ${product.harvest_date}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
    
            // Add hover effect with CSS
            const style = document.createElement('style');
            style.textContent = `
                .product-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
            `;
            document.head.appendChild(style);
    
            // Add click event listeners to all product cards
            const productCards = productList.querySelectorAll('.product-card');
            productCards.forEach(card => {
                card.addEventListener('click', () => {
                    const productId = card.getAttribute('data-product-id');
                    window.location.href = `/templates/product-detail.html?id=${productId}`;
                });
            });
        } else {
            productList.innerHTML = '<p>등록된 상품이 없습니다.</p>';
        }
    }

    // Search Functions
    async function searchUsers(query) {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/search/search-profile/?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            const data = await response.json();
            console.log('Search API response:', data);
            console.log('First user:', data.results[0]);
            displaySearchResults(data);
        } catch (error) {
            console.error('Search error:', error);
            showErrorMessage('사용자 검색 중 오류가 발생했습니다.');
        }
    }

    // Search Functions
    function displaySearchResults(data) {
        if (!searchResults) return;

        const results = data.results || [];
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        results.forEach(user => {
            console.log('User data:', user); // 사용자 데이터 확인
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${getFullImageUrl(user.profile_image)}" alt="${user.username}" width="30">
                <span>${user.username}</span>
            `;

            resultItem.addEventListener('click', function() {
                // user.uuid 대신 user.id 사용
                const newUrl = `/templates/profile.html?uuid=${user.id}`;
                console.log('Navigating to:', newUrl);
                window.location.href = newUrl;
            });

            searchResults.appendChild(resultItem);
        });

        searchResults.style.display = 'block';
    }

    function addEventListeners() {
        // 프로필 편집 버튼
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.location.href = '/templates/edit-profile.html';
            });
        }
    
        // 프로필 설정 버튼
        if (profileSettingsBtn) {
            profileSettingsBtn.addEventListener('click', () => {
                const currentUser = getCurrentUser();
                if (currentUser?.uuid) {
                    window.location.href = `/templates/profile-settings.html?uuid=${currentUser.uuid}`;
                }
            });
        }
    
        // 검색 입력 이벤트
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const query = this.value.trim();
                    if (query.length > 0) {
                        searchUsers(query);
                    } else {
                        if (searchResults) {
                            searchResults.style.display = 'none';
                        }
                    }
                }, 300);
            });
        }
    
        // 검색 결과 외부 클릭 시 숨기기
        document.addEventListener('click', function(event) {
            if (searchResults && !searchResults.contains(event.target) && event.target !== searchInput) {
                searchResults.style.display = 'none';
            }
        });
    
        // 더보기 버튼들
        const showMoreFollowersBtn = document.getElementById('show-more-followers');
        const showMoreFollowingBtn = document.getElementById('show-more-following');
    
        if (showMoreFollowersBtn) {
            showMoreFollowersBtn.addEventListener('click', () => updateFollowersList(true));
        }
        if (showMoreFollowingBtn) {
            showMoreFollowingBtn.addEventListener('click', () => updateFollowingList(true));
        }
    
        // 팔로우/언팔로우 버튼 이벤트 위임 (한 곳에서만 처리)
        document.addEventListener('click', function(event) {
            const button = event.target;
            if (button.classList.contains('follow-btn')) {
                handleFollow(event);
            } else if (button.classList.contains('unfollow-btn')) {
                handleUnfollow(event);
            }
        });
    }

    // Initialize
    function init() {
        loadProfile();
        addEventListeners();
    }

    init();
});