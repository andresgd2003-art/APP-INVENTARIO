document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#inventoryTable tbody');
    const refreshBtn = document.getElementById('refreshBtn');
    const addBtn = document.getElementById('addBtn');
    const modal = document.getElementById('addItemModal');
    const closeBtn = document.querySelector('.close');
    const addItemForm = document.getElementById('addItemForm');
    const loadingDiv = document.getElementById('loading');
    const searchInput = document.getElementById('searchInput');
    const modalTitle = document.getElementById('modalTitle');
    const rowNumberInput = document.getElementById('row_number');
    const actionInput = document.getElementById('action');

    let inventoryData = [];

    // Fetch data function
    async function fetchData() {
        loadingDiv.classList.remove('hidden');
        tableBody.innerHTML = '';
        try {
            const response = await fetch('/api/data');
            const data = await response.json();

            if (Array.isArray(data)) {
                inventoryData = data;
                renderTable(inventoryData);
            } else if (data.error) {
                console.error('Server error:', data.error);
                alert('Error del servidor: ' + data.error);
            } else {
                console.error('Data format incorrect:', data);
                alert('Error en el formato de datos recibido: ' + JSON.stringify(data));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error al cargar los datos.');
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    // Render table function
    function renderTable(data) {
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');

            const sku = item.SKU || item.id || '-';
            const name = item.Nombre_Producto || item.name || '-';
            const quantity = item.Stock_Actual || item.quantity || '-';
            const price = item.Precio_Venta || item.price || '-';

            row.innerHTML = `
                <td>${sku}</td>
                <td>${name}</td>
                <td>${quantity}</td>
                <td>${price}</td>
                <td>
                    <button class="edit-btn" data-row='${JSON.stringify(item)}'>Editar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = JSON.parse(e.target.getAttribute('data-row'));
                editItem(item);
            });
        });
    }

    // Filter data function
    function filterData() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredData = inventoryData.filter(item => {
            const sku = (item.SKU || item.id || '').toString().toLowerCase();
            const name = (item.Nombre_Producto || item.name || '').toString().toLowerCase();
            return sku.includes(searchTerm) || name.includes(searchTerm);
        });
        renderTable(filteredData);
    }

    // Edit item function
    function editItem(item) {
        modalTitle.textContent = 'Editar Item';
        actionInput.value = 'update';
        rowNumberInput.value = item.row_number || '';

        document.getElementById('SKU').value = item.SKU || '';
        document.getElementById('Nombre_Producto').value = item.Nombre_Producto || '';
        document.getElementById('Stock_Actual').value = item.Stock_Actual || '';
        document.getElementById('Precio_Venta').value = item.Precio_Venta || '';

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    // Initial load
    fetchData();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchData);
    searchInput.addEventListener('input', filterData);

    // Modal controls
    addBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Agregar Nuevo Item';
        actionInput.value = 'add';
        rowNumberInput.value = '';
        addItemForm.reset();

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    // Form submission
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addItemForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Success:', result);

            // Close modal and refresh data
            modal.classList.add('hidden');
            modal.style.display = 'none';
            addItemForm.reset();
            fetchData();
            alert('Operación realizada correctamente.');

        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Error al guardar el item.');
        }
    });
});
