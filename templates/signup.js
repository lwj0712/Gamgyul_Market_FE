document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signup-form');
    const errorMessage = document.getElementById('error-message');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');

    function validatePassword() {
        if (password.value != confirmPassword.value) {
            confirmPassword.setCustomValidity("비밀번호가 일치하지 않습니다.");
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    password.onchange = validatePassword;
    confirmPassword.onkeyup = validatePassword;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.textContent = '';

        if (password.value !== confirmPassword.value) {
            errorMessage.textContent = "비밀번호가 일치하지 않습니다.";
            return;
        }

        const formData = new FormData(form);
        formData.delete('confirm_password'); // 서버로 전송하지 않음

        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/signup/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(Object.values(errorData).flat().join(' '));
            }

            const data = await response.json();
            console.log('회원가입 성공:', data);
            
            // 로그인 페이지로 리다이렉트
            window.location.href = '/templates/login.html';
        } catch (error) {
            console.error('회원가입 오류:', error);
            errorMessage.textContent = error.message || '회원가입 중 오류가 발생했습니다.';
        }
    });
});