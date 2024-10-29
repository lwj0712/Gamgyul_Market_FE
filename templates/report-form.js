document.addEventListener('DOMContentLoaded', function() {
    const reportForm = document.getElementById('report-form');

    if (!reportForm) {
        console.error('신고 폼을 찾을 수 없습니다.');
        return;
    }

    // URL 파라미터에서 content_type과 object_id 추출
    const urlParams = new URLSearchParams(window.location.search);
    const contentTypeParam = urlParams.get('content_type');
    const objectIdParam = urlParams.get('object_id');

    // 폼 필드에 값 설정
    const contentTypeField = document.getElementById('content_type');
    const objectIdField = document.getElementById('object_id');

    if (contentTypeField && contentTypeParam) {
        contentTypeField.value = contentTypeParam;
    }
    if (objectIdField && objectIdParam) {
        objectIdField.value = objectIdParam;
    }

    // JWT 토큰 확인
    const token = getJWTToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }

    // 필수 필드가 모두 있는지 확인
    if (!contentTypeField.value || !objectIdField.value) {
        alert('유효한 신고 대상이 아닙니다.');
        window.history.back();
        return;
    }

    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitReport();
    });
});

function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

function isTokenValid(token) {
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp > Date.now() / 1000;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

async function submitReport() {
    const token = getJWTToken();
    if (!token || !isTokenValid(token)) {
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/templates/login.html';
        return;
    }

    const contentType = document.getElementById('content_type').value;
    const objectId = document.getElementById('object_id').value;
    const reason = document.getElementById('reason').value;
    const description = document.getElementById('description').value;

    if (!contentType || !objectId || !reason) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }

    const formData = {
        content_type: contentType,
        object_id: objectId,
        reason: reason,
        description: description
    };

    try {
        // API_BASE_URL이 정의되어 있지 않았으므로 직접 URL 지정
        const response = await fetch(`${API_BASE_URL}/reports/create/`, {  // URL 경로 수정
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        // 응답 타입 확인 및 처리
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('서버 응답이 JSON 형식이 아닙니다.');
        }

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('jwt_token');
                throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
            }
            if (response.status === 403) {
                throw new Error('권한이 없습니다.');
            }
            throw new Error(data.detail || '신고 접수 중 오류가 발생했습니다.');
        }

        alert(data.detail || '신고가 성공적으로 접수되었습니다.');
        document.getElementById('report-form').reset();
        window.location.href = '/templates/index.html';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        
        if (error.message.includes('로그인') || error.message.includes('인증')) {
            window.location.href = '/templates/login.html';
        }
    }
}
