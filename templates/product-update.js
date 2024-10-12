document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('productForm');
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');

    if (!form) {
        console.error('Form with id "productForm" not found');
        return;
    }

    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) {
        alert('상품 ID가 없습니다.');
        window.location.href = 'product-list.html';
        return;
    }

    // Helper functions
    const getValue = (id) => document.getElementById(id)?.value || '';
    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    };

    // 상품 정보 불러오기
    fetch(`${API_BASE_URL}/market/products/${productId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        ['name', 'price', 'description', 'stock', 'variety', 'growing_region', 'harvest_date']
            .forEach(field => setValue(field, data[field]));

        // 기존 이미지 표시
        const imageContainer = document.createElement('div');
        imageContainer.id = 'existingImages';
        data.images.forEach((imageUrl, index) => {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            imageWrapper.innerHTML = `
                <img src="${imageUrl}" style="width:100px; height:100px;">
                <input type="checkbox" name="images_to_delete" value="${imageUrl}" id="delete-image-${index}">
                <label for="delete-image-${index}">삭제</label>
            `;
            imageContainer.appendChild(imageWrapper);
        });
        form.insertBefore(imageContainer, form.querySelector('button[type="submit"]'));
    })
    .catch(error => {
        console.error('Error:', error);
        alert('상품 정보를 불러오는 데 실패했습니다.');
    });

    // 이미지 미리보기 기능
    imageInput.addEventListener('change', function(event) {
        imagePreview.innerHTML = '';
        const files = event.target.files;

        if (files.length > 5) {
            alert('최대 5개의 이미지만 업로드 할 수 있습니다.');
            event.target.value = '';
            return;
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const img = document.createElement('img');
            img.file = file;
            img.style.width = '100px';
            img.style.height = '100px';
            imagePreview.appendChild(img);

            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.readAsDataURL(file);
        });
    });

    // 폼 제출 처리
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();

        ['name', 'price', 'description', 'stock', 'variety', 'growing_region', 'harvest_date']
            .forEach(field => formData.append(field, getValue(field)));

        document.querySelectorAll('input[name="images_to_delete"]:checked')
            .forEach(checkbox => formData.append('images_to_delete', checkbox.value));

        if (imageInput.files) {
            Array.from(imageInput.files).slice(0, 5).forEach(file => formData.append('image', file));
        }

        fetch(`${API_BASE_URL}/market/products/${productId}/update/`, {
            method: 'PATCH',
            body: formData,
            credentials: 'include',
            headers: { 'X-CSRFToken': getCSRFToken() }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
            return response.json();
        })
        .then(data => {
            alert('상품이 성공적으로 수정되었습니다.');
            window.location.href = `product-detail.html?id=${productId}`;
        })
        .catch(error => {
            console.error('Error:', error);
            alert(`상품 수정 중 오류가 발생했습니다: ${error.message}`);
        });
    });
});

function getCSRFToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';
}