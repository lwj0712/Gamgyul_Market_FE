const username = getCurrentUsername();
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        currentUserId = currentUser.id;
    } else {
        console.log('로그인되지 않았거나 사용자 정보를 가져오는데 실패했습니다.');
    }

    fetchProductDetails();

    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.addEventListener('click', handleEditClick);
    }
});

async function fetchProductDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            throw new Error('Product ID not found in URL');
        }

        const [currentUser, productResponse] = await Promise.all([
            getCurrentUser(),
            fetch(`${API_BASE_URL}/market/products/${productId}`)
        ]);

        const product = await productResponse.json();
        const currentUserId = getCurrentUserId();
        
        const profileImage = document.querySelector('#user-profile-image');
        if (profileImage && product.user_profile_image) {
            profileImage.src = product.user_profile_image;
        } else if (profileImage) {
            profileImage.src = '/static/images/default-profile.png';
        }

        displayProductDetails(product, currentUserId);
    } catch (error) {
        console.error('Error fetching product details:', error);
    }
}

function displayProductDetails(product, currentUserId) {
    const profileImage = document.querySelector('.avatar.avatar-story.me-2');
    if (profileImage) {
        profileImage.innerHTML = `
            <img src="${product.user_profile_image || '/static/images/default-profile.png'}" 
                 class="avatar-img rounded-circle" 
                 alt="${product.username}'s profile">
        `;
    }

    const elements = {
        'product-username': product.username,
        'product-timestamp': new Date(product.created_at).toLocaleString(),
        'product-name': product.name,
        'product-price': `${parseInt(product.price).toLocaleString('ko-KR')}`,
        'product-description': product.description,
        'product-stock': product.stock,
        'product-variety': product.variety,
        'product-region': product.growing_region,
        'product-harvest-date': product.harvest_date
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    const productImages = document.getElementById('product-images');
    if (productImages && product.images && product.images.length > 0) {
        productImages.innerHTML = product.images.map((image, index) => `
            <img src="${image}" 
                 alt="${product.name}" 
                 class="img-fluid mb-2" 
                 onerror="this.src='/static/images/default-product.png'">`
        ).join('');
    }

    const editButton = document.getElementById('edit-button');
    const deleteButton = document.getElementById('delete-button');
    
    if (editButton && deleteButton) {
        const isOwner = currentUserId === product.user_id;
        editButton.style.display = isOwner ? 'inline-block' : 'none';
        deleteButton.style.display = isOwner ? 'inline-block' : 'none';
    }

    const reportButton = document.querySelector('.report-button-container');
    if (reportButton) {
        reportButton.style.display = currentUserId !== product.user_id ? 'block' : 'none';
    }
}

function handleEditClick(e) {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        window.location.href = `product-update.html?id=${productId}`;
    } else {
        console.error('Product ID not found');
        alert('상품 ID를 찾을 수 없습니다.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const deleteButton = document.getElementById('delete-button');
    
    deleteButton.addEventListener('click', function() {
        if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            
            fetch(`${API_BASE_URL}/market/products/${productId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getJWTToken()}`
                }
            })
            .then(response => {
                if (response.ok) {
                    alert('상품이 성공적으로 삭제되었습니다.');
                    window.location.href = 'product-list.html';
                } else {
                    alert('상품 삭제에 실패했습니다. 다시 시도해주세요.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('오류가 발생했습니다. 다시 시도해주세요.');
            });
        }
    });
});

function getJWTToken() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

function getCurrentUsername() {
    return localStorage.getItem('username') || '';
}

async function getCurrentUser() {
    try {
        const response = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getJWTToken()}`
            }
        });
        if (!response.ok) {
            throw new Error('사용자 정보를 가져오는데 실패했습니다.');
        }
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('현재 사용자 정보 가져오기 오류:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('report-button').addEventListener('click', function() {
        window.location.href = `report-form.html?content_type=market.product&object_id=${productId}`;
    });
});

function getCurrentUserId() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        const user = JSON.parse(userJson);
        return user.uuid;
    }
    return null;
}