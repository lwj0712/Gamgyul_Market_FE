document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // CSRF 토큰을 가져오는 함수
    function getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            .split('=')[1];
        return cookieValue;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.textContent = '';

        const formData = new FormData(form);

        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/login/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
                body: formData,
                credentials: 'include' // 쿠키를 포함시키기 위해 필요
            });

            // login.js 내부
            if (response.ok) {
                const data = await response.json();
                console.log('로그인 성공:', data);
                localStorage.setItem('username', data.username);
                window.location.href = '/templates/index.html';
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            errorMessage.textContent = error.message;
        }
    });
});