document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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
    const rowNumberInput = document.getElementById('row_number');
    const actionInput = document.getElementById('action');

    // Stats Elements
    const totalProductsEl = document.getElementById('totalProducts');
    const totalValueEl = document.getElementById('totalValue');
    const lowStockEl = document.getElementById('lowStock');

    let inventoryData = [];

    // --- Data Fetching & Stats ---

    async function fetchData() {
        showLoading(true);
        try {
            const response = await fetch('/api/data');
            const data = await response.json();

            if (Array.isArray(data)) {
                inventoryData = data;
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
        if (totalValueEl) totalValueEl.textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
                <td>
                    <button class="btn-icon edit-btn" title="Editar">
                        <span class="material-icons">edit</span>
                    </button>
                </td>
            `;

            // Attach event listener to the edit button in this row
            const editBtn = row.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editItem(item));

            tableBody.appendChild(row);
        });
    }

    function showLoading(isLoading) {
        if (loadingDiv) {
            if (isLoading) loadingDiv.classList.remove('hidden');
            else loadingDiv.classList.add('hidden');
        }
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
        // Optional: updateStats(filteredData);
    }

    // --- Modal & Form Handling ---

    function openModal(mode, item = null) {
        modal.classList.remove('hidden');

        if (mode === 'add') {
            modalTitle.textContent = 'Nuevo Producto';
            actionInput.value = 'add';
            rowNumberInput.value = '';
            addItemForm.reset();
        } else if (mode === 'edit' && item) {
            modalTitle.textContent = 'Editar Producto';
            actionInput.value = 'update';
            rowNumberInput.value = item.row_number || '';

            // Populate fields
            document.getElementById('SKU').value = item.SKU || '';
            document.getElementById('Nombre_Producto').value = item.Nombre_Producto || '';
            document.getElementById('Categoria').value = item.Categoria || '';
            document.getElementById('Proveedor').value = item.Proveedor || '';
            document.getElementById('Costo_Unitario').value = item.Costo_Unitario || '';
            document.getElementById('Precio_Venta').value = item.Precio_Venta || '';
            document.getElementById('Stock_Actual').value = item.Stock_Actual || '';
            document.getElementById('Stock_Minimo').value = item.Stock_Minimo || '';

            // Date formatting
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

            // Basic validation
            const sku = document.getElementById('SKU').value;
            if (!sku) { alert('El SKU es obligatorio'); return; }

            const formData = new FormData(addItemForm);
            const data = Object.fromEntries(formData.entries());

            // Remove row_number for n8n payload (it uses SKU to match)
            delete data.row_number;

            // Show some loading state on button
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
                fetchData(); // Refresh table
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
