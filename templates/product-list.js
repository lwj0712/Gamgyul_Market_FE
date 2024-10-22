let currentPage = 1;
let searchQuery = '';
let searchCategory = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadProducts(currentPage, searchQuery, searchCategory);

    const searchForm = document.getElementById('search-form');
    searchForm.innerHTML = `
        <div class="input-group mb-3">
            <select class="form-select flex-grow-0" style="width: auto;" id="search-category">
                <option value="all">전체</option>
                <option value="name">상품명</option>
                <option value="variety">품종</option>
                <option value="growing_region">재배지역</option>
                <option value="user">판매자</option>
            </select>
            <input type="text" class="form-control" id="search-input" placeholder="검색어를 입력하세요">
            <button class="btn btn-primary" type="submit">검색</button>
        </div>
    `;

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        searchQuery = document.getElementById('search-input').value;
        searchCategory = document.getElementById('search-category').value;
        currentPage = 1;
        loadProducts(currentPage, searchQuery, searchCategory);
    });
});

function loadProducts(page, search, category) {
    let url = `${API_BASE_URL}/market/products/?page=${page}`;
    
    if (search) {
        url += `&q=${encodeURIComponent(search)}`;
        if (category && category !== 'all') {
            url += `&category=${encodeURIComponent(category)}`;
        }
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayProducts(data.results);
            displayPagination(data);
            
            const searchSummary = document.createElement('div');
            searchSummary.className = 'alert alert-info';
            if (search) {
                const categoryText = category === 'all' ? '전체' : 
                    category === 'name' ? '상품명' :
                    category === 'variety' ? '품종' :
                    category === 'growing_region' ? '재배지역' : '판매자';
                searchSummary.textContent = `"${search}" 검색 결과 (${categoryText}) - ${data.count}개의 상품`;
            } else {
                searchSummary.textContent = `전체 상품 - ${data.count}개`;
            }
            const productList = document.getElementById('product-list');
            productList.parentNode.insertBefore(searchSummary, productList);
        })
        .catch(error => {
            console.error('Error:', error);
            const productList = document.getElementById('product-list');
            productList.innerHTML = '<div class="alert alert-danger">상품을 불러오는 중 오류가 발생했습니다.</div>';
        });
}

function displayProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    if (products.length === 0) {
        productList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning text-center">
                    검색 결과가 없습니다.
                    ${searchQuery ? `<br><small>"${searchQuery}" 에 대한 검색어를 변경해보세요.</small>` : ''}
                </div>
            </div>`;
        return;
    }

    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'col-sm-6 col-lg-4 mb-4';
        productElement.innerHTML = `
            <div class="card h-100">
                <img src="${product.image || DEFAULT_PROFILE_IMAGE}" class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">
                <div class="card-body">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">${parseInt(product.price).toLocaleString('ko-KR')} 원</p>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-person"></i> ${product.user}
                        </small>
                    </p>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-box"></i> 재고: ${product.stock}개
                        </small>
                    </p>
                </div>
                <div class="card-footer bg-transparent border-top-0">
                    <a href="product-detail.html?id=${product.id}" class="btn btn-primary w-100">상세보기</a>
                </div>
            </div>
        `;
        productList.appendChild(productElement);
    });
}

function displayPagination(data) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(data.count / 10);

    if (totalPages <= 1) {
        return;
    }

    if (data.previous) {
        addPageButton(pagination, currentPage - 1, '이전');
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        addPageButton(pagination, 1);
        if (startPage > 2) {
            pagination.appendChild(createEllipsis());
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        addPageButton(pagination, i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination.appendChild(createEllipsis());
        }
        addPageButton(pagination, totalPages);
    }

    if (data.next) {
        addPageButton(pagination, currentPage + 1, '다음');
    }
}

function addPageButton(parent, pageNumber, text = pageNumber) {
    const li = document.createElement('li');
    li.className = `page-item ${pageNumber === currentPage ? 'active' : ''}`;
    
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = text;
    a.addEventListener('click', function(e) {
        e.preventDefault();
        currentPage = pageNumber;
        loadProducts(currentPage, searchQuery);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    li.appendChild(a);
    parent.appendChild(li);
}

document.addEventListener('DOMContentLoaded', fetchProducts);