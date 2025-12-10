document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const tableBody = document.querySelector('#inventoryTable tbody');
    const refreshBtn = document.getElementById('refreshBtn');
    const addBtn = document.getElementById('addBtn');
    const modal = document.getElementById('addItemModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.querySelector('.close-modal');
    const addItemForm = document.getElementById('addItemForm');
    const loadingDiv = document.getElementById('loading');
    const searchInput = document.getElementById('searchInput');
    const modalTitle = document.getElementById('modalTitle');

    const actionInput = document.getElementById('action');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const pageTitle = document.getElementById('pageTitle');

    // Stats Elements
    const totalProductsEl = document.getElementById('totalProducts');
    const totalValueEl = document.getElementById('totalValue');
    const lowStockEl = document.getElementById('lowStock');

    // Settings Elements
    const darkModeToggle = document.getElementById('darkModeToggle');
    const interfaceSizeSelect = document.getElementById('interfaceSize');

    // Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = {
        dashboard: document.getElementById('dashboard-section'),
        reports: document.getElementById('reports-section'),
        settings: document.getElementById('settings-section')
    };

    let inventoryData = [];
    let categoryChart = null;
    let topProductsChart = null;

    // --- Settings Logic ---

    // Dark Mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
            // Re-render charts to update colors if needed
            if (!sections.reports.classList.contains('hidden')) {
                renderCharts();
            }
        });
    }

    // Interface Size
    const savedSize = localStorage.getItem('interfaceSize') || 'medium';
    document.body.classList.add(`size-${savedSize}`);
    if (interfaceSizeSelect) interfaceSizeSelect.value = savedSize;

    if (interfaceSizeSelect) {
        interfaceSizeSelect.addEventListener('change', () => {
            const newSize = interfaceSizeSelect.value;
            document.body.classList.remove('size-small', 'size-medium', 'size-large');
            document.body.classList.add(`size-${newSize}`);
            localStorage.setItem('interfaceSize', newSize);
        });
    }

    // --- Navigation Logic ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');

            // Update Active Link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show Target Section
            Object.values(sections).forEach(sec => sec.classList.add('hidden'));
            sections[targetSection].classList.remove('hidden');

            // Update Title
            // Get text node only, ignoring the icon span
            const textNode = Array.from(link.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                pageTitle.textContent = textNode.textContent.trim();
            } else {
                // Fallback if structure changes
                pageTitle.textContent = link.innerText.replace(/^[a-z_]+\s/i, '').trim();
            }

            // Mobile: Close sidebar after click
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }

            // Render Charts if Reports
            if (targetSection === 'reports') {
                renderCharts();
            }
        });
    });

    // Mobile Menu Toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // --- Data Fetching & Stats ---

    async function fetchData() {
        showLoading(true);
        try {
            const response = await fetch('/api/data');
            const data = await response.json();

            if (Array.isArray(data)) {
                inventoryData = data.map(item => ({
                    ...item,
                    '#columna': item['#columna'] || item['row_number']
                }));
                renderTable(inventoryData);
                updateStats(inventoryData);
            } else if (data.error) {
                console.error('Server error:', data.error);
                alert('Error del servidor: ' + data.error);
            } else {
                console.error('Data format incorrect:', data);
                alert('Error: Formato de datos incorrecto.');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error al cargar los datos. Revise la consola.');
        } finally {
            showLoading(false);
        }
    }

    function updateStats(data) {
        const totalProducts = data.length;
        const totalValue = data.reduce((sum, item) => {
            const price = parseFloat(item.Precio_Venta || 0);
            const stock = parseInt(item.Stock_Actual || 0);
            return sum + (price * stock);
        }, 0);

        const lowStockCount = data.filter(item => {
            const stock = parseInt(item.Stock_Actual || 0);
            const min = parseInt(item.Stock_Minimo || 5);
            return stock <= min;
        }).length;

        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalValueEl) totalValueEl.textContent = `$${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        if (lowStockEl) lowStockEl.textContent = lowStockCount;
    }

    // --- Rendering ---

    function renderTable(data) {
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');

            const sku = item.SKU || item.id || '-';
            const name = item.Nombre_Producto || item.name || '-';
            const category = item.Categoria || '-';
            const provider = item.Proveedor || '-';

            // Format currency
            const cost = item.Costo_Unitario ? `$${parseFloat(item.Costo_Unitario).toFixed(2)}` : '-';
            const price = item.Precio_Venta ? `$${parseFloat(item.Precio_Venta).toFixed(2)}` : '-';

            const stock = parseInt(item.Stock_Actual || 0);

            // Status Badge
            const minStock = parseInt(item.Stock_Minimo || 5);
            let statusBadge = '';
            if (stock <= minStock) {
                statusBadge = `<span class="badge low-stock">Bajo Stock</span>`;
            } else {
                statusBadge = `<span class="badge in-stock">En Stock</span>`;
            }

            row.innerHTML = `
                <td><strong>${sku}</strong></td>
                <td>${name}</td>
                <td>${category}</td>
                <td>${provider}</td>
                <td>${cost}</td>
                <td>${price}</td>
                <td>${stock}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" title="Editar">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-icon delete-btn" title="Eliminar">
                        <span class="material-icons">delete</span>
                    </button>
                </td>
            `;

            // Attach event listeners
            const editBtn = row.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editItem(item));

            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteItem(item));

            tableBody.appendChild(row);
        });
    }

    function showLoading(isLoading) {
        if (loadingDiv) {
            if (isLoading) loadingDiv.classList.remove('hidden');
            else loadingDiv.classList.add('hidden');
        }
    }

    // --- Charts ---
    function renderCharts() {
        if (!inventoryData.length) return;

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#cbd5e1' : '#64748b';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        // Prepare Data: Stock per Category
        const categories = {};
        inventoryData.forEach(item => {
            const cat = item.Categoria || 'Sin Categoría';
            const stock = parseInt(item.Stock_Actual || 0);
            categories[cat] = (categories[cat] || 0) + stock;
        });

        // Prepare Data: Top 5 Products
        const sortedProducts = [...inventoryData].sort((a, b) => (parseInt(b.Stock_Actual) || 0) - (parseInt(a.Stock_Actual) || 0)).slice(0, 5);

        // Render Category Chart
        const ctxCat = document.getElementById('categoryChart').getContext('2d');
        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: textColor }
                    }
                }
            }
        });

        // Render Top Products Chart
        const ctxTop = document.getElementById('topProductsChart').getContext('2d');
        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: sortedProducts.map(p => p.Nombre_Producto),
                datasets: [{
                    label: 'Stock',
                    data: sortedProducts.map(p => parseInt(p.Stock_Actual)),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // --- Filtering ---

    function filterData() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredData = inventoryData.filter(item => {
            const sku = (item.SKU || '').toString().toLowerCase();
            const name = (item.Nombre_Producto || '').toString().toLowerCase();
            const category = (item.Categoria || '').toString().toLowerCase();
            const provider = (item.Proveedor || '').toString().toLowerCase();

            return sku.includes(searchTerm) ||
                name.includes(searchTerm) ||
                category.includes(searchTerm) ||
                provider.includes(searchTerm);
        });
        renderTable(filteredData);
    }

    // --- Modal & Actions ---

    function openModal(mode, item = null) {
        modal.classList.remove('hidden');

        if (mode === 'add') {
            modalTitle.textContent = 'Nuevo Producto';
            actionInput.value = 'add';
            document.getElementById('columna').value = '';
            addItemForm.reset();
        } else if (mode === 'edit' && item) {
            modalTitle.textContent = 'Editar Producto';
            actionInput.value = 'update';
            // Use bracket notation for #columna
            document.getElementById('columna').value = item['#columna'] || item['row_number'] || '';

            // Populate fields
            document.getElementById('SKU').value = item.SKU || '';
            document.getElementById('Nombre_Producto').value = item.Nombre_Producto || '';
            document.getElementById('Categoria').value = item.Categoria || '';
            document.getElementById('Proveedor').value = item.Proveedor || '';
            document.getElementById('Costo_Unitario').value = item.Costo_Unitario || '';
            document.getElementById('Precio_Venta').value = item.Precio_Venta || '';
            document.getElementById('Stock_Actual').value = item.Stock_Actual || '';
            document.getElementById('Stock_Minimo').value = item.Stock_Minimo || '';

            let dateVal = item.Ultima_Reposicion || '';
            if (dateVal && dateVal.length >= 10) dateVal = dateVal.substring(0, 10);
            document.getElementById('Ultima_Reposicion').value = dateVal;
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function editItem(item) {
        openModal('edit', item);
    }

    async function deleteItem(item) {
        if (!confirm(`¿Estás seguro de eliminar el producto "${item.Nombre_Producto}"?`)) return;

        showLoading(true);
        try {
            const payload = {
                action: 'clear',
                '#columna': item['#columna'] // Send #columna for deletion
            };
            console.log('Sending delete payload:', payload);

            const response = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            console.log('Delete success:', result);
            fetchData(); // Refresh
            alert('Producto eliminado correctamente.');
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar el producto.');
        } finally {
            showLoading(false);
        }
    }

    // Event Listeners
    if (refreshBtn) refreshBtn.addEventListener('click', fetchData);
    if (searchInput) searchInput.addEventListener('input', filterData);

    if (addBtn) {
        addBtn.addEventListener('click', () => openModal('add'));
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Form Submit
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const sku = document.getElementById('SKU').value;
            if (!sku) { alert('El SKU es obligatorio'); return; }

            const formData = new FormData(addItemForm);
            const data = Object.fromEntries(formData.entries());
            // #columna is included in formData because we updated the input name

            const submitBtn = addItemForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Guardando...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                console.log('Success:', result);

                closeModal();
                addItemForm.reset();
                fetchData();
                alert('Operación realizada correctamente.');

            } catch (error) {
                console.error('Error submitting form:', error);
                alert('Error al guardar el item.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Initial Load
    fetchData();
});
