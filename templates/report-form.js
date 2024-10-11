// report-form.js

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

    // 디버깅용 콘솔 로그
    console.log('contentTypeParam:', contentTypeParam);
    console.log('objectIdParam:', objectIdParam);

    // 폼 필드에 값 설정
    const contentTypeField = document.getElementById('content_type');
    const objectIdField = document.getElementById('object_id');

    if (contentTypeField && contentTypeParam) {
        contentTypeField.value = contentTypeParam;
    }
    if (objectIdField && objectIdParam) {
        objectIdField.value = objectIdParam;
    }

    // 디버깅용 콘솔 로그
    console.log('contentTypeField.value:', contentTypeField.value);
    console.log('objectIdField.value:', objectIdField.value);

    // 필수 필드가 모두 있는지 확인
    if (!contentTypeField.value || !objectIdField.value) {
        alert('유효한 신고 대상이 아닙니다.');
        window.history.back(); // 이전 페이지로 돌아가기
        return;
    }

    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitReport();
    });
});

async function submitReport() {
    const contentType = document.getElementById('content_type').value;
    const objectId = document.getElementById('object_id').value;
    const reason = document.getElementById('reason').value;
    const description = document.getElementById('description').value;

    // 필수 필드 확인
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
        const response = await fetch('http://127.0.0.1:8000/report/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('권한이 없습니다. 로그인 상태를 확인해주세요.');
            }
            const errorData = await response.json();
            throw new Error(errorData.detail || '신고 접수 중 오류가 발생했습니다.');
        }

        const data = await response.json();
        alert(data.detail || '신고가 성공적으로 접수되었습니다.');
        document.getElementById('report-form').reset();
        window.location.href = 'index.html'; // 신고 후 메인 페이지로 이동
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// getCSRFToken 함수 정의
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // 이 쿠키 문자열이 우리가 찾는 이름으로 시작하는지 확인합니다.
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
