document.addEventListener('DOMContentLoaded', function() {
    // Constants and Config
    const API_BASE_URL = 'http://127.0.0.1:8000';
    const DEFAULT_PROFILE_IMAGE = '/templates/images/team_profile.png';
    const USERS_TO_SHOW = 5;

    // JWT 관련 유틸리티 함수
    function getJWTToken() {
        return localStorage.getItem('jwt_token');
    }

    function setJWTToken(token) {
        localStorage.setItem('jwt_token', token);
    }

    function removeJWTToken() {
        localStorage.removeItem('jwt_token');
    }

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
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileSettingsBtn = document.getElementById('profile-settings-btn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const navProfileImage = document.getElementById('nav-profile-image');
    const dropdownProfileImage = document.getElementById('dropdown-profile-image');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const signOutLink = document.getElementById('sign-out-link');
    const viewProfileLink = document.getElementById('view-profile-link');
    const profileSettingsLink = document.getElementById('profile-settings-link');
    const postList = document.getElementById('post-list');
    const notificationCount = document.getElementById('notification-count');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    const clearAllNotificationsBtn = document.getElementById('clear-all-notifications');

    let allFollowers = [];
    let allFollowing = [];
    let notifications = [];

    // API 요청 함수 수정
    async function fetchWithAuth(url, method = 'GET', body = null) {
        const token = getJWTToken();
        if (!token && !url.includes('/login/')) {
            window.location.href = '/templates/login.html';
            return;
        }

        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (response.status === 401) {
            removeJWTToken();
            window.location.href = '/templates/login.html';
            return;
        }

        return response;
    }

    function showErrorMessage(message) {
        alert(message);
    }

    async function loadProfile() {
        try {
            const currentUser = getCurrentUser();
            
            if (!currentUser || !currentUser.uuid) {
                showLoginLink();
                return;
            }
    
            const response = await fetchWithAuth(`${API_BASE_URL}/accounts/profile/${currentUser.uuid}/`);
            if (response.ok) {
                const profileData = await response.json();
                updateProfileUI(profileData);
            } else if (response.status === 401) {
                showLoginLink();
            } else {
                throw new Error('프로필 로드 실패');
            }
        } catch (error) {
            console.error('프로필 로드 중 오류 발생:', error);
            showErrorMessage('프로필을 불러오는 데 실패했습니다. 다시 시도해 주세요.');
        }
    }
    
    // 현재 사용자 정보를 가져오는 함수
    function getCurrentUser() {
        // localStorage에서 사용자 정보 가져오기
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('사용자 정보 파싱 오류:', error);
            return null;
        }
    }

    function updateProfileUI(profileData) {
        if (profileImage) profileImage.src = getFullImageUrl(profileData.profile_image) || DEFAULT_PROFILE_IMAGE;
        if (usernameElement) usernameElement.textContent = profileData.username;
        if (bioElement) bioElement.textContent = profileData.bio || '소개가 없습니다.';
        if (followersCountElement) followersCountElement.textContent = profileData.followers_count || 0;
        if (followingCountElement) followingCountElement.textContent = profileData.following_count || 0;
    
        updateEmailDisplay(profileData);
        renderFollowersList(profileData.followers || []);
        renderFollowingList(profileData.following || []);
        renderPostList(profileData.posts || []);
        renderProductList(profileData.products || []);
        updateProfileButtons(profileData.is_self);
    
        if (loginLink) loginLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline';
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
            followBtn.style.display = 'none';
            editProfileBtn.style.display = 'inline';
            profileSettingsBtn.style.display = 'inline';
        } else {
            followBtn.style.display = 'inline';
            editProfileBtn.style.display = 'none';
            profileSettingsBtn.style.display = 'none';
        }
    }

    function updateProfileDropdown(profileData) {
        if (navProfileImage) navProfileImage.src = getFullImageUrl(profileData.profile_image) || DEFAULT_PROFILE_IMAGE;
        if (dropdownProfileImage) dropdownProfileImage.src = getFullImageUrl(profileData.profile_image) || DEFAULT_PROFILE_IMAGE;
        if (dropdownUsername) dropdownUsername.textContent = profileData.username;
        if (dropdownEmail) dropdownEmail.textContent = profileData.email;
    
        if (viewProfileLink) {
            viewProfileLink.href = `/templates/profile.html?username=${profileData.username}`;
        }
    
        if (profileSettingsLink) {
            profileSettingsLink.href = `/templates/profile-settings.html?username=${profileData.username}`;
        }
    }

    // 팔로워 목록을 렌더링할 때
    function renderFollowersList(followers) {
        if (!Array.isArray(followers)) {
            console.warn('Followers data is not an array:', followers);
            followers = [];
        }
        allFollowers = followers; // 모든 팔로워를 포함
        updateFollowersList();
        if (followersCountElement) {
            followersCountElement.textContent = allFollowers.length;
        }
    }
    
    // 팔로잉 목록을 렌더링할 때
    function renderFollowingList(following) {
        if (!Array.isArray(following)) {
            console.warn('Following data is not an array:', following);
            following = [];
        }
        allFollowing = following; // 모든 팔로잉 사용자를 포함
        updateFollowingList();
    }

    function updateFollowersList(showAll = false) {
        const followersToShow = showAll ? allFollowers : allFollowers.slice(0, USERS_TO_SHOW);
        followersList.innerHTML = followersToShow.map(follower => createUserListItem(follower, 'follower')).join('');
        
        const showMoreFollowersBtn = document.getElementById('show-more-followers');
        if (allFollowers.length > USERS_TO_SHOW) {
            showMoreFollowersBtn.style.display = showAll ? 'none' : 'block';
            showMoreFollowersBtn.onclick = () => updateFollowersList(true);
        } else {
            showMoreFollowersBtn.style.display = 'none';
        }

        addUserInteractionListeners();
    }

    function updateFollowingList(showAll = false) {
        const followingToShow = showAll ? allFollowing : allFollowing.slice(0, USERS_TO_SHOW);
        followingList.innerHTML = followingToShow.map(following => createUserListItem(following, 'following')).join('');
        
        const showMoreFollowingBtn = document.getElementById('show-more-following');
        if (allFollowing.length > USERS_TO_SHOW) {
            showMoreFollowingBtn.style.display = showAll ? 'none' : 'block';
            showMoreFollowingBtn.onclick = () => updateFollowingList(true);
        } else {
            showMoreFollowingBtn.style.display = 'none';
        }

        addUserInteractionListeners();
    }

    function createUserListItem(user, type) {
        const currentUser = getCurrentUser();
        const isCurrentUser = user.uuid === currentUser.uuid;
        
        return `
            <li class="list-group-item d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                     <img src="${getFullImageUrl(user.profile_image) || DEFAULT_PROFILE_IMAGE}" alt="${user.username}" class="avatar-img rounded-circle" style="width: 40px; height: 40px;">
                    <div class="ms-3">
                        <h6 class="mb-0">${user.username}${isCurrentUser ? ' (나)' : ''}</h6>
                    </div>
                </div>
                <div>
                    ${!isCurrentUser ? `
                        <button class="btn btn-sm ${type === 'following' ? 'btn-danger-soft unfollow-btn' : 'btn-success-soft follow-btn'}" data-user-uuid="${user.uuid}">
                            ${type === 'following' ? '언팔로우' : '팔로우'}
                        </button>
                    ` : ''}
                </div>
            </li>
        `;
    }

    // 새로운 함수 추가
    function renderPostList(posts) {
        if (posts && posts.length > 0) {
            const postListHtml = posts.map(post => `
                <div class="col-sm-6 col-lg-4">
                    <div class="card h-100">
                        <div class="position-relative">
                            <img src="${post.images[0] ? `${API_BASE_URL}${post.images[0]}` : DEFAULT_PROFILE_IMAGE}" class="card-img-top" alt="게시물 이미지">
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}</h5>
                            <p class="small"><i class="bi bi-calendar-event me-2"></i>${new Date(post.created_at).toLocaleDateString()}</p>
                            <ul class="nav nav-stack py-3 small">
                                <li class="nav-item">
                                    <i class="bi bi-heart-fill me-1"></i>${post.likes_count || 0}
                                </li>
                                <li class="nav-item ms-sm-auto">
                                    <i class="bi bi-chat-left-text-fill me-1"></i>${post.comments.length || 0}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            `).join('');
            
            postList.innerHTML = postListHtml;
        } else {
            postList.innerHTML = '<p class="col-12">등록된 게시물이 없습니다.</p>';
        }
    }

    // Product Functions
    function renderProductList(products) {
        if (products && products.length > 0) {
            const productListHtml = products.map(product => `
                <div class="card mb-3">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${product.images[0] || DEFAULT_PROFILE_IMAGE}" class="img-fluid rounded-start" alt="${product.name}">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text">가격: ${product.price}</p>
                                <p class="card-text">재고: ${product.stock}</p>
                                <p class="card-text">품종: ${product.variety}</p>
                                <p class="card-text">재배 지역: ${product.growing_region}</p>
                                <p class="card-text">수확일: ${product.harvest_date}</p>
                                <p class="card-text"><small class="text-muted">평균 평점: ${product.average_rating}</small></p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            productList.innerHTML = productListHtml;
        } else {
            productList.innerHTML = '<p>등록된 상품이 없습니다.</p>';
        }
    }

    // Event Handlers
    async function handleFollow() {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/follow/${userId}/`, 'POST');
            if (response.ok) {
                loadProfile();
            } else {
                throw new Error('팔로우 실패');
            }
        } catch (error) {
            console.error('팔로우 중 오류 발생:', error);
            showErrorMessage('팔로우 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    }

    async function handleFollowUnfollow(event) {
        const targetUuid = event.target.getAttribute('data-user-uuid');
        const isFollowing = event.target.classList.contains('unfollow-btn');
        const url = isFollowing 
            ? `${API_BASE_URL}/accounts/unfollow/${targetUuid}/`
            : `${API_BASE_URL}/accounts/follow/${targetUuid}/`;

        try {
            const response = await fetchWithAuth(url, isFollowing ? 'DELETE' : 'POST');
            if (response.ok) {
                const data = await response.json();
                updateFollowButton(event.target, !isFollowing);
                updateFollowCounts(data);
            } else {
                throw new Error(isFollowing ? '언팔로우 실패' : '팔로우 실패');
            }
        } catch (error) {
            console.error(`${isFollowing ? '언팔로우' : '팔로우'} 중 오류 발생:`, error);
            showErrorMessage(`${isFollowing ? '언팔로우' : '팔로우'} 처리 중 오류가 발생했습니다.`);
        }
    }

    function updateFollowButton(button, isCurrentlyFollowing) {
        if (isCurrentlyFollowing) {
            button.textContent = '팔로우';
            button.classList.remove('unfollow-btn', 'btn-danger-soft');
            button.classList.add('follow-btn', 'btn-success-soft');
        } else {
            button.textContent = '언팔로우';
            button.classList.remove('follow-btn', 'btn-success-soft');
            button.classList.add('unfollow-btn', 'btn-danger-soft');
        }
    }

    function updateFollowCounts(data) {
        if (followingCountElement) {
            followingCountElement.textContent = data.following_count;
        }
    }

    // 로그인 처리 함수
    async function handleLogin(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/accounts/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                setJWTToken(data.token);
                localStorage.setItem('user_uuid', data.uuid);
                window.location.href = '/templates/profile.html?uuid=' + data.uuid;
            } else {
                throw new Error('로그인 실패');
            }
        } catch (error) {
            console.error('로그인 중 오류 발생:', error);
            showErrorMessage('로그인 처리 중 오류가 발생했습니다.');
        }
    }


    // 로그아웃 처리 함수
    async function handleLogout(e) {
        e.preventDefault();
        removeJWTToken();
        localStorage.removeItem('user_uuid');
        window.location.href = '/templates/login.html';
    }

    // Search Functions
    async function searchUsers(query) {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/search/?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            const data = await response.json();
            displaySearchResults(data);
        } catch (error) {
            console.error('Search error:', error);
            showErrorMessage('사용자 검색 중 오류가 발생했습니다.');
        }
    }

    function displaySearchResults(data) {
        const results = data.results || [];
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${user.profile_image || DEFAULT_PROFILE_IMAGE}" alt="${user.username}" width="30">
                <span>${user.username}</span>
            `;
            resultItem.addEventListener('click', () => {
                window.location.href = `/templates/profile.html?uuid=${user.uuid}`;
            });
            searchResults.appendChild(resultItem);
        });

        searchResults.style.display = 'block';
    }

    // Helper Functions
    function addUserInteractionListeners() {
        document.querySelectorAll('.follow-btn, .unfollow-btn').forEach(button => {
            button.addEventListener('click', handleFollowUnfollow);
        });
    }

    function showLoginLink() {
        loginLink.style.display = 'inline';
        logoutBtn.style.display = 'none';
    }

    // Initialization
    async function loadLoggedInUserProfile() {
        try {
            const loggedInUsername = getCurrentUserId();
            if (!loggedInUsername) {
                throw new Error('로그인한 사용자 정보를 찾을 수 없습니다.');
            }
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/profile/${loggedInUsername}/`);
            if (response.ok) {
                const profileData = await response.json();
                updateProfileDropdown(profileData);
            } else {
                throw new Error('로그인한 사용자 프로필 로드 실패');
            }
        } catch (error) {
            console.error('로그인한 사용자 프로필 로드 중 오류 발생:', error);
            showErrorMessage('로그인한 사용자 프로필을 불러오는 데 실패했습니다.');
        }
    }

    function initialize() {
        loadProfile();
        loadLoggedInUserProfile();

        const showMoreFollowersBtn = document.getElementById('show-more-followers');
        const showMoreFollowingBtn = document.getElementById('show-more-following');

        if (showMoreFollowersBtn) {
            showMoreFollowersBtn.addEventListener('click', () => updateFollowersList(true));
        }
        if (showMoreFollowingBtn) {
            showMoreFollowingBtn.addEventListener('click', () => updateFollowingList(true));
        }
    }

    // Event Listeners
    editProfileBtn.addEventListener('click', () => {
        window.location.href = '/templates/edit-profile.html';
    });

    // 프로필 설정 변경
    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', () => {
            const currentUserUuid = getCurrentUser().uuid;
            window.location.href = `/templates/profile-settings.html?uuid=${currentUserUuid}`;
        });
    }

    if (profileSettingsLink) {
        profileSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const currentUserUuid = getCurrentUser().uuid;
            window.location.href = `/templates/profile-settings.html?uuid=${currentUserUuid}`;
        });
    }

    followBtn.addEventListener('click', handleFollow);
    signOutLink.addEventListener('click', handleLogout);

    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = this.value.trim();
            if (query.length > 0) {
                searchUsers(query);
            } else {
                searchResults.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', function(event) {
        if (!searchResults.contains(event.target) && event.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });

    // Initialize
    initialize();

    // Notification Functions
    async function fetchCurrentUserInfo() {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/current-user/`);
            if (response.ok) {
                const userData = await response.json();
                currentUserId = userData.id;
                return userData;
            } else {
                throw new Error('Failed to fetch current user info');
            }
        } catch (error) {
            console.error('Error fetching current user info:', error);
            showErrorMessage('사용자 정보를 불러오는 데 실패했습니다.');
        }
    }

    function updateNotificationCount() {
        const count = notifications.length;
        if (notificationCount) notificationCount.textContent = count;
        if (notificationBadge) notificationBadge.style.display = count > 0 ? 'inline' : 'none';
    }

    function renderNotifications() {
        console.log('Notifications data:', notifications);

        if (!Array.isArray(notifications)) {
            console.error('notifications is not an array:', notifications);
            return;
        }

        if (!notificationList) {
            console.error('Notification list element not found');
            return;
        }

        notificationList.innerHTML = '';
        notifications.forEach((notification) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="list-group-item list-group-item-action rounded d-flex border-0 mb-1 p-3">
                    <div class="avatar text-center d-none d-sm-inline-block">
                        <img class="avatar-img rounded-circle" src="${getFullImageUrl(notification.sender.profile_image)}" alt="">
                    </div>
                    <div class="ms-sm-3 d-flex">
                        <div>
                            <p class="small mb-2">${notification.message}</p>
                            <p class="small ms-3">${new Date(notification.created_at).toLocaleString()}</p>
                        </div>
                        <button class="btn btn-sm btn-danger-soft ms-auto" onclick="deleteNotification('${notification.id}')">삭제</button>
                    </div>
                </div>
            `;
            notificationList.appendChild(li);
        });
        updateNotificationCount();
    }

    async function fetchNotifications() {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/`);
            if (response.ok) {
                const data = await response.json();
                console.log('Server response:', data);
                
                notifications = Array.isArray(data) ? data : (data.results || []);
                
                renderNotifications();
            } else {
                throw new Error('알림 가져오기 실패');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            showErrorMessage('알림을 불러오는 데 실패했습니다.');
        }
    }

    async function deleteNotification(notificationId) {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/${notificationId}/delete/`, 'DELETE');
            if (response.ok) {
                notifications = notifications.filter(n => n.id !== notificationId);
                renderNotifications();
            } else {
                throw new Error('알림 삭제 실패');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            showErrorMessage('알림 삭제 중 오류가 발생했습니다.');
        }
    }

    async function clearAllNotifications() {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/delete-all/`, 'DELETE');
            if (response.ok) {
                notifications = [];
                renderNotifications();
            } else {
                throw new Error('모든 알림 삭제 실패');
            }
        } catch (error) {
            console.error('Error clearing all notifications:', error);
            showErrorMessage('모든 알림 삭제 중 오류가 발생했습니다.');
        }
    }

    // WebSocket 연결 수정
    function setupWebSocket() {
        const userUuid = localStorage.getItem('user_uuid');
        if (!userUuid) {
            console.error('User UUID is not available');
            return;
        }

        const socket = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws/alarm/${userUuid}/`);

        socket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            if (data.alarm) {
                notifications.unshift(data.alarm);
                renderNotifications();
            }
        };

        socket.onclose = function(e) {
            console.error('Alarm socket closed unexpectedly');
            setTimeout(() => setupWebSocket(), 5000);
        };

        socket.onerror = function(e) {
            console.error('WebSocket error occurred', e);
        };
    }

    // Initialization
    async function init() {
        try {
            const userData = await fetchCurrentUserInfo();
            if (userData) {
                updateProfileDropdown(userData);
                setupWebSocket();
                await fetchNotifications();
                await loadProfile();
                await loadLoggedInUserProfile();
            } else {
                throw new Error('Failed to initialize user data');
            }
        } catch (error) {
            console.error('Error initializing application:', error);
            showErrorMessage('애플리케이션을 초기화하는 데 실패했습니다.');
        }
    }

    // Event Listeners
    editProfileBtn.addEventListener('click', () => {
        window.location.href = '/templates/edit-profile.html';
    });

    // 프로필 설정 변경
    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', () => {
            const currentUserUuid = getCurrentUser().uuid;
            window.location.href = `/templates/profile-settings.html?uuid=${currentUserUuid}`;
        });
    }

    if (profileSettingsLink) {
        profileSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const currentUserUuid = getCurrentUser().uuid;
            window.location.href = `/templates/profile-settings.html?uuid=${currentUserUuid}`;
        });
    }

    followBtn.addEventListener('click', handleFollow);
    signOutLink.addEventListener('click', handleLogout);

    if (clearAllNotificationsBtn) {
        clearAllNotificationsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearAllNotifications();
        });
    }

    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = this.value.trim();
            if (query.length > 0) {
                searchUsers(query);
            } else {
                searchResults.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', function(event) {
        if (!searchResults.contains(event.target) && event.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });

    // Initialize
    init();

    // 주기적으로 알림 업데이트 (선택사항)
    setInterval(fetchNotifications, 60000); // 1분마다 업데이트
});
    
// 전역 스코프에 deleteNotification 함수 추가
window.deleteNotification = deleteNotification;