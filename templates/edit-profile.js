document.addEventListener('DOMContentLoaded', function() {
    const editProfileForm = document.getElementById('edit-profile-form');
    const usernameInput = document.getElementById('username');
    const bioInput = document.getElementById('bio');
    const profileImageInput = document.getElementById('profile-image');
    const currentProfileImage = document.getElementById('current-profile-image');
    const backToProfileLink = document.getElementById('back-to-profile');

    let currentUsername = '';

    // 현재 프로필 정보 로드
    async function loadCurrentProfile() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/profile/', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                const profileData = await response.json();
                usernameInput.value = profileData.username;
                bioInput.value = profileData.bio || '';
                if (profileData.profile_image) {
                    currentProfileImage.src = profileData.profile_image;
                }
                currentUsername = profileData.username;
                
                // 프로필로 돌아가기 링크 업데이트
                backToProfileLink.href = `/templates/profile.html?username=${currentUsername}`;
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
            const response = await fetch('http://127.0.0.1:8000/accounts/profile/', {
                method: 'PATCH',
                body: formData,
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                alert('프로필이 성공적으로 수정되었습니다.');
                window.location.href = `/templates/profile.html?username=${updatedProfile.username}`;
            } else {
                const errorData = await response.json();
                alert('프로필 수정 실패: ' + JSON.stringify(errorData));
            }
        } catch (error) {
            console.error('프로필 수정 중 오류 발생:', error);
            alert('프로필 수정 중 오류가 발생했습니다.');
        }
    });

    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }
});