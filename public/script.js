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

        // Remove row_number from the payload sent to n8n
        // We match by SKU for updates, and we don't want to overwrite row_number in Sheets
        delete data.row_number;

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
