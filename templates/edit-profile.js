const API_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_PROFILE_IMAGE = '/templates/images/placeholder.jpg';

// JWT Token Utilities
function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    const token = getJWTToken();
    
    if (!userStr || !token) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        return null;
    }
}

function isLoggedIn() {
    return !!getJWTToken() && !!getCurrentUser();
}

// 이미지 URL 처리 함수 추가
function getFullImageUrl(imageUrl) {
    if (!imageUrl) return DEFAULT_PROFILE_IMAGE;
    
    // 이미 완전한 URL인 경우
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // media 경로로 시작하는 경우
    if (imageUrl.startsWith('media/') || imageUrl.startsWith('/media/')) {
        return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    return DEFAULT_PROFILE_IMAGE;
}

async function fetchWithAuth(url, method = 'GET', body = null) {
    const token = getJWTToken();
    if (!token) {
        window.location.href = '/templates/login.html';
        return null;
    }

    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    if (!(body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    if (body) {
        options.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        window.location.href = '/templates/login.html';
        return null;
    }

    return response;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!isLoggedIn()) {
        window.location.href = '/templates/login.html';
        return;
    }

    const editProfileForm = document.getElementById('edit-profile-form');
    const usernameInput = document.getElementById('username');
    const bioInput = document.getElementById('bio');
    const profileImageInput = document.getElementById('profile-image');
    const currentProfileImage = document.getElementById('current-profile-image');
    const backToProfileLink = document.getElementById('back-to-profile');

    // 현재 프로필 정보 로드
    async function loadCurrentProfile() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/profiles/profile/`);
            if (!response) return;
    
            if (response.ok) {
                const profileData = await response.json();
                console.log('Loaded profile data:', profileData);
    
                usernameInput.value = profileData.username;
                bioInput.value = profileData.bio || '';
                
                // 프로필 이미지 처리
                if (currentProfileImage) {
                    currentProfileImage.src = getFullImageUrl(profileData.profile_image);
                    currentProfileImage.onerror = function() {
                        this.src = DEFAULT_PROFILE_IMAGE;
                    };
                }
                
                if (backToProfileLink && profileData.id) {
                    backToProfileLink.href = `/templates/profile.html?uuid=${profileData.id}`;
                }
    
                // 로컬 스토리지 사용자 정보 업데이트
                if (profileData.id) {
                    localStorage.setItem('user', JSON.stringify({
                        uuid: profileData.id,
                        email: profileData.email,
                        username: profileData.username,
                        profile_image: profileData.profile_image
                    }));
                }
            } else {
                const errorData = await response.json();
                console.error('프로필 정보 로드 실패:', errorData);
                alert('프로필 정보를 불러오는데 실패했습니다: ' + JSON.stringify(errorData));
            }
        } catch (error) {
            console.error('프로필 정보 로드 중 오류 발생:', error);
            alert('프로필 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 초기 프로필 로드
    loadCurrentProfile();

    // 이미지 미리보기 함수
    function handleImagePreview(file) {
        if (file && currentProfileImage) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentProfileImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // 프로필 이미지 변경 이벤트 리스너
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleImagePreview(file);
            }
        });
    }

    // 프로필 수정 제출
    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
    
        const formData = new FormData();
        formData.append('username', usernameInput.value);
        formData.append('bio', bioInput.value);
    
        if (profileImageInput.files.length > 0) {
            formData.append('profile_image', profileImageInput.files[0]);
        }
    
        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/profiles/profile/`,
                'PATCH',
                formData
            );
    
            if (response && response.ok) {
                const updatedProfile = await response.json();
                console.log('Updated profile data:', updatedProfile);
                
                if (updatedProfile.id) {
                    localStorage.setItem('user', JSON.stringify({
                        uuid: updatedProfile.id,
                        email: updatedProfile.email,
                        username: updatedProfile.username,
                        profile_image: updatedProfile.profile_image
                    }));
                    
                    alert('프로필이 성공적으로 수정되었습니다.');
                    window.location.href = `/templates/profile.html?uuid=${updatedProfile.id}`;
                }
            } else if (response) {
                const errorData = await response.json();
                alert('프로필 수정 실패: ' + JSON.stringify(errorData));
            }
        } catch (error) {
            console.error('프로필 수정 중 오류 발생:', error);
            alert('프로필 수정 중 오류가 발생했습니다.');
        }
    });
});