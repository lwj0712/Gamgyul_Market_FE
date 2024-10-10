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

    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileSettingsBtn = document.getElementById('profile-settings-btn');

    editProfileBtn.addEventListener('click', function() {
        window.location.href = '/templates/edit-profile.html';
    });

    profileSettingsBtn.addEventListener('click', function() {
        const username = getCurrentUsername(); // 현재 로그인한 사용자의 username을 가져오는 함수
        window.location.href = `/templates/profile-settings.html?username=${username}`;
    });

    function getCurrentUsername() {
        return localStorage.getItem('username') || '';
    }

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
            followersList.innerHTML = profileData.followers.map(follower => `
                <li class="user-item">
                    <img src="${follower.profile_image || '/path/to/default/image.jpg'}" alt="${follower.username || '사용자'}" class="profile-image">
                    <span class="username">${follower.username || '알 수 없는 사용자'}</span>
                    <button class="chat-btn" data-user-id="${follower.id}">채팅</button>
                    <button class="follow-btn" data-user-id="${follower.id}">팔로우</button>
                </li>
            `).join('');
        } else {
            followersListSection.style.display = 'none';
        }

        // 팔로잉 목록
        if (profileData.following) {
            followingListSection.style.display = 'block';
            followingList.innerHTML = profileData.following.map(following => `
                <li class="user-item">
                    <img src="${following.profile_image || '/path/to/default/image.jpg'}" alt="${following.username || '사용자'}" class="profile-image">
                    <span class="username">${following.username || '알 수 없는 사용자'}</span>
                    <button class="chat-btn" data-user-id="${following.id}">채팅</button>
                    <button class="unfollow-btn" data-user-id="${following.id}">언팔로우</button>
                </li>
            `).join('');
        } else {
            followingListSection.style.display = 'none';
        }

        // 채팅, 팔로우, 언팔로우 버튼 이벤트 리스너 추가
        document.querySelectorAll('.chat-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                // 채팅 기능 구현 (예: 채팅 페이지로 이동) 아직 구현 x
                console.log(`Chat with user ${userId}`);
            });
        });

        document.querySelectorAll('.follow-btn, .unfollow-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const userId = this.getAttribute('data-user-id');
                const isFollowing = this.classList.contains('unfollow-btn');
                const url = isFollowing 
                    ? `http://127.0.0.1:8000/accounts/unfollow/${userId}/`
                    : `http://127.0.0.1:8000/accounts/follow/${userId}/`;
            
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-CSRFToken': getCSRFToken(),
                            'Content-Type': 'application/json'
                        }
                    });
                
                    if (response.ok) {
                        const data = await response.json();
                        
                        // 버튼 상태 업데이트
                        if (isFollowing) {
                            this.textContent = '팔로우';
                            this.classList.remove('unfollow-btn');
                            this.classList.add('follow-btn');
                        } else {
                            this.textContent = '언팔로우';
                            this.classList.remove('follow-btn');
                            this.classList.add('unfollow-btn');
                        }
                        
                        // 팔로워 수 업데이트
                        const followersCountElement = document.querySelector('.followers-count');
                        if (followersCountElement) {
                            followersCountElement.textContent = data.followers_count;
                        }
        
                        // 필요한 경우 다른 프로필 정보 업데이트
                        updateProfileInfo(data);
                    } else {
                        const errorData = await response.json();
                        console.error(isFollowing ? '언팔로우 실패' : '팔로우 실패', errorData.detail);
                    }
                } catch (error) {
                    console.error(`${isFollowing ? '언팔로우' : '팔로우'} 중 오류 발생:`, error);
                }
            });
        });
        
        function updateProfileInfo(data) {
            // 필요한 프로필 정보 업데이트
            const followingCountElement = document.querySelector('.following-count');
            if (followingCountElement) {
                followingCountElement.textContent = data.following_count;
            }        
        }

        // 상품 목록
        if (profileData.products && profileData.products.length > 0) {
            const productListHtml = profileData.products.map(product => `
                <div class="card mb-3">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${product.images[0] || '/path/to/default/image.jpg'}" class="img-fluid rounded-start" alt="${product.name}">
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

        // 팔로우 버튼 표시 (자기 자신의 프로필이 아닐 경우)
        if (profileData.is_self) {
            followBtn.style.display = 'none';
            editProfileBtn.style.display = 'inline';
            profileSettingsBtn.style.display = 'inline';
        } else {
            followBtn.style.display = 'inline';
            editProfileBtn.style.display = 'none';
            profileSettingsBtn.style.display = 'none';
        }

        loginLink.style.display = 'none';
        logoutBtn.style.display = 'inline';
    }

    followBtn.addEventListener('click', async function() {
        try {
            const response = await fetch(`http://127.0.0.1:8000/accounts/follow/${userId}/`, {
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

    // 검색 기능 설정
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

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

    // 검색 결과 영역 외 클릭 시 결과 숨기기
    document.addEventListener('click', function(event) {
        if (!searchResults.contains(event.target) && event.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    });

    async function searchUsers(query) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/accounts/search/?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (!response.ok) {
                throw new Error('Search request failed');
            }

            const data = await response.json();
            displaySearchResults(data);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    function displaySearchResults(results) {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${user.profile_image || '/path/to/default/image.jpg'}" alt="${user.username}" width="30">
                <span>${user.username}</span>
            `;
            resultItem.addEventListener('click', () => {
                window.location.href = `/templates/profile.html?username=${user.username}`;
            });
            searchResults.appendChild(resultItem);
        });

        searchResults.style.display = 'block';
    }
    
    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    loadProfile();
});