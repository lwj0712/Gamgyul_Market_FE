let currentPage = 1;
let searchQuery = '';
let searchCategory = 'all';
let ordering = '-created_at';

document.addEventListener('DOMContentLoaded', function() {
    loadProducts(currentPage, searchQuery, searchCategory);

    const searchForm = document.getElementById('search-form');
    searchForm.innerHTML = `
        <div class="d-flex gap-3 mb-3">
            <div class="input-group">
                <select class="form-select flex-grow-0" style="width: auto;" id="search-category">
                    <option value="all">전체</option>
                    <option value="name">상품명</option>
                    <option value="user">판매자</option>
                </select>
                <input type="text" class="form-control" id="search-input" placeholder="검색어를 입력하세요">
                <button class="btn btn-primary" type="submit">검색</button>
            </div>
            <select class="form-select flex-grow-0" style="width: auto;" id="order-select">
                <option value="-created_at">최신순</option>
                <option value="created_at">오래된순</option>
            </select>
        </div>
    `;

    const orderSelect = document.getElementById('order-select');
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('search-category');

    orderSelect.value = ordering;
    searchInput.value = searchQuery;
    categorySelect.value = searchCategory;

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        searchQuery = searchInput.value.trim();
        searchCategory = categorySelect.value;
        currentPage = 1;
        loadProducts(currentPage, searchQuery, searchCategory);
    });

    searchInput.addEventListener('input', function(e) {
        if (this.value === '') {
            searchQuery = '';
            searchCategory = 'all';
            categorySelect.value = 'all';
            currentPage = 1;
            loadProducts(currentPage, searchQuery, searchCategory);
        }
    });

    orderSelect.addEventListener('change', function(e) {
        e.preventDefault();
        ordering = this.value;
        currentPage = 1;
        
        loadProducts(currentPage, searchQuery, searchCategory);
    });
});

function loadProducts(page, search, category) {
    const baseUrl = `${API_BASE_URL}/search/search-product/`;

    const params = new URLSearchParams({
        page: page,
        ordering: ordering
    });
    
    if (search) {
        params.append('q', search);
        if (category !== 'all') {
            params.append('category', category);
        }
    }
    
    fetch(`${baseUrl}?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            displayProducts(data.results);
            displayPagination(data);
            
            const oldSummary = document.querySelector('.alert.alert-info');
            if (oldSummary) {
                oldSummary.remove();
            }
            
            if (search) {
                const searchSummary = document.createElement('div');
                searchSummary.className = 'alert alert-info';
                const categoryText = category === 'all' ? '전체' : 
                    category === 'name' ? '상품명' : '판매자';
                searchSummary.textContent = `"${search}" 검색 결과 (${categoryText}) - ${data.count}개의 상품`;
                
                const productList = document.getElementById('product-list');
                productList.parentNode.insertBefore(searchSummary, productList);
            }
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
    if (!pagination) {
        console.error('Pagination element not found');
        return;
    }
    
    pagination.innerHTML = '';

    const totalPages = Math.ceil(data.count / 10);
    
    if (totalPages <= 1) {
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';
    
    if (currentPage > 1) {
        const prevLi = createPageItem('이전', currentPage - 1);
        ul.appendChild(prevLi);
    }

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            const li = createPageItem(i, i);
            if (i === currentPage) {
                li.classList.add('active');
            }
            ul.appendChild(li);
        } else if (
            (i === currentPage - 3 && currentPage > 4) ||
            (i === currentPage + 3 && currentPage < totalPages - 3)
        ) {
            const ellipsis = document.createElement('li');
            ellipsis.className = 'page-item disabled';
            ellipsis.innerHTML = '<span class="page-link">...</span>';
            ul.appendChild(ellipsis);
        }
    }

    if (currentPage < totalPages) {
        const nextLi = createPageItem('다음', currentPage + 1);
        ul.appendChild(nextLi);
    }

    pagination.appendChild(ul);
}

function createPageItem(text, pageNumber) {
    const li = document.createElement('li');
    li.className = 'page-item';
    
    const link = document.createElement('a');
    link.className = 'page-link';
    link.href = '#';
    link.textContent = text;
    
    link.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = pageNumber;
        loadProducts(currentPage, searchQuery, searchCategory);
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    li.appendChild(link);
    return li;
}