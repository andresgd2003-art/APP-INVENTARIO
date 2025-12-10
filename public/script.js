// Global variables
let inventoryData = [];
let chartInstances = {};

// DOM Elements
const inventoryTable = document.getElementById('inventoryTable');
const loadingSpinner = document.getElementById('loading');
const modal = document.getElementById('addItemModal');
const modalTitle = document.getElementById('modalTitle');
const addItemForm = document.getElementById('addItemForm');
const actionInput = document.getElementById('action');
const addBtn = document.getElementById('addBtn');
const fabAddBtn = document.getElementById('fabAddBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.close-modal');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const totalProductsEl = document.getElementById('totalProducts');
const totalValueEl = document.getElementById('totalValue');
const lowStockEl = document.getElementById('lowStock');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const navLinks = document.querySelectorAll('.nav-links li a');
const sections = {
    dashboard: document.getElementById('dashboard-section'),
    reports: document.getElementById('reports-section'),
    settings: document.getElementById('settings-section')
};
const pageTitle = document.getElementById('pageTitle');
const darkModeToggle = document.getElementById('darkModeToggle');
const interfaceSizeSelect = document.getElementById('interfaceSize');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
    loadSettings();
});

function setupEventListeners() {
    if (refreshBtn) refreshBtn.addEventListener('click', fetchData);
    if (searchInput) searchInput.addEventListener('input', filterData);

    if (addBtn) {
        addBtn.addEventListener('click', () => openModal('add'));
    }
    if (fabAddBtn) {
        fabAddBtn.addEventListener('click', () => openModal('add'));
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

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

    // Settings Listeners
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', darkModeToggle.checked);
        });
    }

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
            const targetSection = link.parentElement.getAttribute('data-section');

            // Update Active Link
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');

            // Show Target Section
            Object.values(sections).forEach(sec => sec.classList.add('hidden'));
            sections[targetSection].classList.remove('hidden');

            // Update Title
            const textNode = Array.from(link.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (textNode) {
                pageTitle.textContent = textNode.textContent.trim();
            } else {
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

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

function loadSettings() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    const savedSize = localStorage.getItem('interfaceSize') || 'medium';
    document.body.classList.add(`size-${savedSize}`);
    if (interfaceSizeSelect) interfaceSizeSelect.value = savedSize;
}

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
    const tbody = inventoryTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay datos disponibles</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');

        const sku = item.SKU || '-';
        const name = item.Nombre_Producto || '-';
        const category = item.Categoria || '-';
        const provider = item.Proveedor || '-';
        const cost = item.Costo_Unitario ? `$${parseFloat(item.Costo_Unitario).toFixed(2)}` : '-';
        const price = item.Precio_Venta ? `$${parseFloat(item.Precio_Venta).toFixed(2)}` : '-';
        const stock = parseInt(item.Stock_Actual) || 0;
        const minStock = parseInt(item.Stock_Minimo) || 0;

        let statusBadge = '';
        if (stock <= minStock) {
            statusBadge = '<span class="badge low-stock">Bajo Stock</span>';
        } else {
            statusBadge = '<span class="badge in-stock">En Stock</span>';
        }

        row.innerHTML = `
            <td data-label="SKU"><strong>${sku}</strong></td>
            <td data-label="Producto">${name}</td>
            <td data-label="Categoría">${category}</td>
            <td data-label="Proveedor">${provider}</td>
            <td data-label="Costo">${cost}</td>
            <td data-label="Precio">${price}</td>
            <td data-label="Stock">${stock}</td>
            <td data-label="Estado">${statusBadge}</td>
            <td class="actions-cell" data-label="Acciones">
                <button class="btn-icon edit-btn" title="Editar">
                    <span class="material-icons">edit</span>
                </button>
                <button class="btn-icon delete-btn" title="Eliminar">
                    <span class="material-icons">delete</span>
                </button>
            </td>
        `;

        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => openModal('edit', item));

        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteItem(item));

        tbody.appendChild(row);
    });
}

function updateStats(data) {
    const totalProducts = data.length;
    const totalValue = data.reduce((sum, item) => {
        const price = parseFloat(item.Precio_Venta) || 0;
        const stock = parseInt(item.Stock_Actual) || 0;
        return sum + (price * stock);
    }, 0);
    const lowStockCount = data.filter(item => {
        const stock = parseInt(item.Stock_Actual) || 0;
        const min = parseInt(item.Stock_Minimo) || 0;
        return stock <= min;
    }).length;

    totalProductsEl.textContent = totalProducts;
    totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
    lowStockEl.textContent = lowStockCount;
}

function filterData() {
    const query = searchInput.value.toLowerCase();
    const filtered = inventoryData.filter(item => {
        return (
            (item.SKU && item.SKU.toLowerCase().includes(query)) ||
            (item.Nombre_Producto && item.Nombre_Producto.toLowerCase().includes(query)) ||
            (item.Categoria && item.Categoria.toLowerCase().includes(query))
        );
    });
    renderTable(filtered);
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

async function deleteItem(item) {
    if (!confirm(`¿Estás seguro de eliminar el producto "${item.Nombre_Producto}"?`)) return;

    // Use #columna for deletion ID
    const deleteId = item['#columna'] || item['row_number'];

    try {
        const response = await fetch('/api/data', {
            method: 'POST', // Using POST with action=delete as per n8n setup usually
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                '#columna': deleteId
            })
        });

        const result = await response.json();
        console.log('Delete success:', result);
        fetchData();
        alert('Producto eliminado correctamente.');

    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error al eliminar el producto.');
    }
}

function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
        inventoryTable.classList.add('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
        inventoryTable.classList.remove('hidden');
    }
}

// Charts Logic
function renderCharts() {
    if (chartInstances.category) chartInstances.category.destroy();
    if (chartInstances.topProducts) chartInstances.topProducts.destroy();

    // Prepare Data
    const categories = {};
    inventoryData.forEach(item => {
        const cat = item.Categoria || 'Otros';
        categories[cat] = (categories[cat] || 0) + (parseInt(item.Stock_Actual) || 0);
    });

    const topProducts = [...inventoryData]
        .sort((a, b) => (parseInt(b.Stock_Actual) || 0) - (parseInt(a.Stock_Actual) || 0))
        .slice(0, 5);

    // Category Chart
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    chartInstances.category = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Top Products Chart
    const ctxTop = document.getElementById('topProductsChart').getContext('2d');
    chartInstances.topProducts = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: topProducts.map(p => p.Nombre_Producto),
            datasets: [{
                label: 'Stock',
                data: topProducts.map(p => parseInt(p.Stock_Actual) || 0),
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
