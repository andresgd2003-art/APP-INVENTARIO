document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#inventoryTable tbody');
    const refreshBtn = document.getElementById('refreshBtn');
    const addBtn = document.getElementById('addBtn');
    const modal = document.getElementById('addItemModal');
    const closeBtn = document.querySelector('.close');
    const addItemForm = document.getElementById('addItemForm');
    const loadingDiv = document.getElementById('loading');

    // Fetch data function
    async function fetchData() {
        loadingDiv.classList.remove('hidden');
        tableBody.innerHTML = '';
        try {
            const response = await fetch('/api/data');
            const data = await response.json();

            if (Array.isArray(data)) {
                data.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.SKU || item.id || '-'}</td>
                        <td>${item.Nombre_Producto || item.name || '-'}</td>
                        <td>${item.Stock_Actual || item.quantity || '-'}</td>
                        <td>${item.Precio_Venta || item.price || '-'}</td>
                    `;
                    tableBody.appendChild(row);
                });
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

    // Initial load
    fetchData();

    // Refresh button
    refreshBtn.addEventListener('click', fetchData);

    // Modal controls
    addBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Ensure flex display for centering
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
            alert('Item agregado correctamente (o enviado a n8n).');

        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error al agregar el item.');
        }
    });
});
