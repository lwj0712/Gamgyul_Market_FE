let imageFiles = [];

// JWT 토큰 가져오기 함수
function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

// DOM이 완전히 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // JWT 토큰이 없으면 로그인 페이지로 리다이렉트
    if (!getJWTToken()) {
        window.location.href = '/templates/login.html';
        return;
    }

    console.log('DOM 로드 완료, 이벤트 리스너 등록 시작.');

    // 이미지 업로드 핸들러
    document.getElementById('imageUpload').addEventListener('change', function(event) {
        console.log('이미지 선택 이벤트 발생');
        const selectedFiles = Array.from(event.target.files);  
        const totalFiles = imageFiles.length + selectedFiles.length;

        if (totalFiles > 10) {
            alert('최대 10개의 이미지만 첨부할 수 있습니다.');
            return;
        }

        imageFiles = [...imageFiles, ...selectedFiles];
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; 

        for (let i = 0; i < imageFiles.length; i++) {
            const listItem = document.createElement('li');
            listItem.textContent = imageFiles[i].name;
            fileList.appendChild(listItem);
        }
    });

    // 게시물 작성 핸들러
    document.getElementById('postForm').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('게시물 작성 버튼 클릭됨');

        // 글 내용과 이미지 필드 가져오기
        const content = document.getElementById('content').value.trim(); 
        const location = document.getElementById('location').value; 
        const tagsInput = document.getElementById('tags').value;

        console.log('이미지 파일 개수:', imageFiles.length);
        console.log('게시물 내용:', content);
        console.log('위치:', location);
        console.log('태그:', tagsInput);

        // 필수 항목 체크
        if (imageFiles.length === 0) {
            alert('이미지를 첨부해 주세요.');
            return;
        }

        if (!content) {
            alert('글 내용을 작성해 주세요.');
            return;
        }

        const formData = new FormData(); 
        formData.append('content', content); 
        formData.append('location', location); 

        const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        formData.append('tags', JSON.stringify(tagsArray));

        for (let i = 0; i < imageFiles.length; i++) {
            formData.append('images', imageFiles[i]);
        }

        console.log('폼 데이터 준비 완료, 서버로 전송 시도');

        // JWT 토큰 가져오기
        const token = getJWTToken();
        if (!token) {
            alert('로그인이 필요합니다.');
            window.location.href = '/templates/login.html';
            return;
        }

        fetch(`${API_BASE_URL}/posts/posts/`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                // 토큰이 만료되었거나 유효하지 않은 경우
                localStorage.removeItem('jwt_token');
                window.location.href = '/templates/login.html';
                throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
            }
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            alert('게시물이 성공적으로 작성되었습니다.');
            window.location.href = '/templates/index.html';  
        })
        .catch(error => {
            console.error('Error:', error);
            if (error.message === '인증이 만료되었습니다. 다시 로그인해주세요.') {
                alert(error.message);
            } else {
                alert('게시물 작성 중 오류가 발생했습니다.');
            }
        });
    });
});