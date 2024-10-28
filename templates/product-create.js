document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('productForm');
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');

    if (!form) {
        console.error('Form with id "productForm" not found');
        return;
    }

    imageInput.addEventListener('change', function(event) {
        imagePreview.innerHTML = '';
        const files = event.target.files;

        if (files.length > 5) {
            alert('최대 5개의 이미지만 업로드 할 수 있습니다.');
            event.target.value = '';
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')){ continue }

            const img = document.createElement('img');
            img.file = file;
            imagePreview.appendChild(img);

            const reader = new FileReader();
            reader.onload = (function(aImg) { 
                return function(e) { 
                    aImg.src = e.target.result; 
                }; 
            })(img);
            reader.readAsDataURL(file);
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
    
        const formData = new FormData();

        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value : '';
        };

        formData.append('name', getValue('name'));
        formData.append('price', getValue('price'));
        formData.append('description', getValue('description'));
        formData.append('stock', getValue('stock'));
        formData.append('variety', getValue('variety'));
        formData.append('growing_region', getValue('growing_region'));
        formData.append('harvest_date', getValue('harvest_date'));
    
        if (imageInput && imageInput.files) {
            for (let i = 0; i < Math.min(imageInput.files.length, 5); i++) {
                formData.append('images', imageInput.files[i]);
            }
        }
    
        fetch(`${API_BASE_URL}/market/products/`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${getJWTToken()}`
            }
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
            alert('상품이 성공적으로 등록되었습니다.');
            if (data.id) {
                window.location.href = `product-detail.html?id=${data.id}`;
            } else {
                console.error('상품 ID가 반환되지 않았습니다.');
                window.location.href = 'product-list.html';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(`상품 등록 중 오류가 발생했습니다: ${error.message}`);
        });
    });
});

function getJWTToken() {
    return localStorage.getItem('jwt_token') || '';
}