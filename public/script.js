// Global variables
let inventoryData = [];
let categoryChart = null;
let stockStatusChart = null;

// DOM Elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const navLinks = document.querySelectorAll('.nav-links li');
const sections = document.querySelectorAll('.section-content');
const pageTitle = document.getElementById('pageTitle');
const modal = document.getElementById('addItemModal');
const addBtn = document.getElementById('addBtn'); // Desktop button
const fabAddBtn = document.getElementById('fabAddBtn'); // Mobile FAB
const closeModalBtn = document.querySelector('.close');
const cancelModalBtn = document.querySelector('.close-modal');
const addItemForm = document.getElementById('addItemForm');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const modalTitle = document.getElementById('modalTitle');
const actionInput = document.getElementById('action');
const loadingSpinner = document.getElementById('loading');
const darkModeToggle = document.getElementById('darkModeToggle');
const interfaceSizeSelect = document.getElementById('interfaceSize');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
    loadSettings();
});

function setupEventListeners() {
    // Mobile Menu Toggle
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            e.target !== mobileMenuBtn) {
            sidebar.classList.remove('active');
        }
    });

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            switchSection(sectionId);

            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Modal Actions
    if (addBtn) addBtn.addEventListener('click', () => openModal('add'));
    if (fabAddBtn) fabAddBtn.addEventListener('click', () => openModal('add'));

    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Form Submit
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const sku = document.getElementById('SKU').value;
            if (!sku) { alert('El SKU es obligatorio'); return; }

            const formData = new FormData(addItemForm);
            const data = Object.fromEntries(formData.entries());

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

    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = inventoryData.filter(item =>
            (item.Nombre_Producto && item.Nombre_Producto.toLowerCase().includes(term)) ||
            (item.SKU && item.SKU.toString().toLowerCase().includes(term)) ||
            (item.Categoria && item.Categoria.toLowerCase().includes(term))
        );
        renderTable(filtered);
    });

    // Refresh
    refreshBtn.addEventListener('click', fetchData);

    // Settings
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', darkModeToggle.checked);
        });
    }

    if (interfaceSizeSelect) {
        interfaceSizeSelect.addEventListener('change', (e) => {
            document.body.className = document.body.className.replace(/size-\w+/g, '');
            document.body.classList.add(`size-${e.target.value}`);
            if (darkModeToggle.checked) document.body.classList.add('dark-mode');
            localStorage.setItem('interfaceSize', e.target.value);
        });
    }
}

// --- Core Functions ---

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

function renderTable(data) {
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No se encontraron productos.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        const sku = item.SKU || '-';
        const name = item.Nombre_Producto || 'Sin Nombre';
        const category = item.Categoria || '-';
        const provider = item.Proveedor || '-';
        const cost = item.Costo_Unitario ? `$${parseFloat(item.Costo_Unitario).toFixed(2)}` : '$0.00';
        const price = item.Precio_Venta ? `$${parseFloat(item.Precio_Venta).toFixed(2)}` : '$0.00';
        const stock = parseInt(item.Stock_Actual || 0);
        const minStock = parseInt(item.Stock_Minimo || 5);

        let statusBadge = '<span class="badge in-stock">En Stock</span>';
        if (stock <= minStock) {
            statusBadge = '<span class="badge low-stock">Bajo Stock</span>';
        }

        row.innerHTML = `
            <td class="actions-cell" data-label="Acciones">
                <button class="btn-icon edit-btn" title="Editar">
                    <span class="material-icons">edit</span>
                </button>
                <button class="btn-icon delete-btn" title="Eliminar">
                    <span class="material-icons">delete</span>
                </button>
            </td>
            <td data-label="SKU"><strong>${sku}</strong></td>
            <td data-label="Producto">${name}</td>
            <td data-label="Categoría">${category}</td>
            <td data-label="Proveedor">${provider}</td>
            <td data-label="Costo">${cost}</td>
            <td data-label="Precio">${price}</td>
            <td data-label="Stock">${stock}</td>
            <td data-label="Estado">${statusBadge}</td>
        `;

        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        editBtn.addEventListener('click', () => openModal('edit', item));
        deleteBtn.addEventListener('click', () => deleteItem(item));

        tbody.appendChild(row);
    });
}

function updateStats(data) {
    const totalProducts = data.length;
    const totalValue = data.reduce((sum, item) => sum + (parseFloat(item.Costo_Unitario || 0) * parseFloat(item.Stock_Actual || 0)), 0);
    const lowStockItems = data.filter(item => parseInt(item.Stock_Actual) <= parseInt(item.Stock_Minimo || 5));

    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('lowStock').textContent = lowStockItems.length;

    updateCharts(data, lowStockItems);
    renderLowStockList(lowStockItems);
}

function updateCharts(data, lowStockItems) {
    // Category Chart
    const categories = {};
    data.forEach(item => {
        categories[item.Categoria] = (categories[item.Categoria] || 0) + parseInt(item.Stock_Actual || 0);
    });

    const ctxCat = document.getElementById('categoryChart').getContext('2d');

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Stock Status Chart (Doughnut)
    const inStockCount = data.length - lowStockItems.length;
    const ctxStatus = document.getElementById('stockStatusChart').getContext('2d');

    if (stockStatusChart) stockStatusChart.destroy();

    stockStatusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['En Stock', 'Stock Bajo'],
            datasets: [{
                data: [inStockCount, lowStockItems.length],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderLowStockList(items) {
    const tbody = document.querySelector('#lowStockTable tbody');
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">¡Todo en orden! No hay alertas.</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.Nombre_Producto}</strong></td>
            <td style="color: var(--danger-color); font-weight:bold;">${item.Stock_Actual}</td>
            <td>${item.Stock_Minimo || 5}</td>
            <td><span class="badge low-stock">Reponer</span></td>
        `;
        tbody.appendChild(row);
    });
}

// --- UI Helpers ---

function switchSection(sectionId) {
    // Update Nav
    navLinks.forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`li[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update Content
    sections.forEach(section => section.classList.add('hidden'));
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');

    // Update Title
    const titles = {
        'dashboard': 'Panel Principal',
        'reports': 'Reportes y Análisis',
        'settings': 'Configuración'
    };
    pageTitle.textContent = titles[sectionId] || 'Inventario';
}

function openModal(mode, item = null) {
    modal.classList.remove('hidden');

    if (mode === 'add') {
        modalTitle.textContent = 'Nuevo Producto';
        actionInput.value = 'add';
        addItemForm.reset();

        // Calculate next column number
        const maxCol = inventoryData.reduce((max, item) => {
            const col = parseInt(item['#columna'] || item['row_number'] || 0);
            return col > max ? col : max;
        }, 0);
        document.getElementById('columna').value = maxCol + 1;

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

function showLoading(show) {
    if (loadingSpinner) {
        if (show) loadingSpinner.classList.remove('hidden');
        else loadingSpinner.classList.add('hidden');
    }
}

function loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    const size = localStorage.getItem('interfaceSize') || 'medium';
    document.body.classList.add(`size-${size}`);
    if (interfaceSizeSelect) interfaceSizeSelect.value = size;
}

async function deleteItem(item) {
    if (!confirm(`¿Estás seguro de eliminar "${item.Nombre_Producto}"?`)) return;

    // Use #columna for deletion ID
    const id = item['#columna'] || item['row_number'];

    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                '#columna': id
            })
        });

        const result = await response.json();
        console.log('Delete result:', result);
        fetchData();
        alert('Producto eliminado correctamente.');

    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error al eliminar el producto.');
    }
}
