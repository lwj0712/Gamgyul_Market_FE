document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const reactivationContainer = document.getElementById('reactivation-container');
    const reactivationButton = document.getElementById('request-reactivation');

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
        reactivationContainer.style.display = 'none';

        const formData = new FormData(form);

        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/login/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('로그인 성공:', data);
                localStorage.setItem('username', data.username);
                window.location.href = '/templates/index.html';
            } else if (response.status === 403) {
                const errorData = await response.json();
                if (errorData.inactive_account) {
                    reactivationContainer.style.display = 'block';
                    throw new Error('계정이 비활성화되어 있습니다. 재활성화하시겠습니까?');
                } else {
                    throw new Error(errorData.detail || '로그인에 실패했습니다.');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            errorMessage.textContent = error.message;
        }
    });

    reactivationButton.addEventListener('click', async function() {
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/request-reactivation/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({ email: email }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.detail);
                reactivationContainer.style.display = 'none';
            } else {
                throw new Error(data.detail || '재활성화 요청에 실패했습니다.');
            }
        } catch (error) {
            console.error('재활성화 요청 오류:', error);
            errorMessage.textContent = error.message;
        }
    });
});