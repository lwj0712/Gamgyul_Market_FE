const API_BASE_URL = 'http://127.0.0.1:8000';

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
            // 프로필 조회 API 엔드포인트 수정
            const response = await fetchWithAuth(`${API_BASE_URL}/profiles/profile/`);
            if (!response) return;
    
            if (response.ok) {
                const profileData = await response.json();
                console.log('Loaded profile data:', profileData);
    
                usernameInput.value = profileData.username;
                bioInput.value = profileData.bio || '';
                if (profileData.profile_image) {
                    currentProfileImage.src = `${API_BASE_URL}${profileData.profile_image}`;
                }
                
                if (backToProfileLink && profileData.id) {
                    backToProfileLink.href = `/templates/profile.html?uuid=${profileData.id}`;
                }
    
                // 로컬 스토리지 사용자 정보 업데이트
                if (profileData.id) {  // id가 존재하는 경우에만 저장
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

    loadCurrentProfile();

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
                
                if (updatedProfile.id) {  // id가 존재하는 경우에만 저장
                    localStorage.setItem('user', JSON.stringify({
                        uuid: updatedProfile.id,
                        email: updatedProfile.email,
                        username: updatedProfile.username,
                        profile_image: updatedProfile.profile_image
                    }));
                }
    
                alert('프로필이 성공적으로 수정되었습니다.');
                if (updatedProfile.id) {
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

    // 프로필 이미지 미리보기
    profileImageInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentProfileImage.src = e.target.result;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
});