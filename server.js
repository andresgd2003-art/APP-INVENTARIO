const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to get Webhook URL
const getWebhookUrl = () => {
    try {
        const url = fs.readFileSync(path.join(__dirname, 'n8n_url.txt'), 'utf8').trim();
        return url;
    } catch (err) {
        console.error('Error reading n8n_url.txt:', err);
        return null;
    }
};

// Routes

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Endpoint to fetch inventory data
app.get('/api/data', async (req, res) => {
    try {
        const n8nUrl = getWebhookUrl();
        if (!n8nUrl || n8nUrl.includes('YOUR_N8N')) {
            // Mock data for testing if URL is not set
            return res.json([
                { id: 1, name: 'Item 1', quantity: 10, price: 100 },
                { id: 2, name: 'Item 2', quantity: 5, price: 200 }
            ]);
        }
        const response = await axios.get(n8nUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data from n8n:', error.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// API Endpoint to add/update inventory data
app.post('/api/data', async (req, res) => {
    try {
        const data = req.body;
        const n8nUrl = getWebhookUrl();

        if (!n8nUrl || n8nUrl.includes('YOUR_N8N')) {
            console.log('Mock sending data to n8n:', data);
            return res.json({ success: true, message: 'Data received (Mock)' });
        }
        // Assuming the same URL handles POST or you might want to append a query param or use a different line in the file.
        // For now, we use the same URL.
        const response = await axios.post(n8nUrl, data);
        res.json(response.data);
    } catch (error) {
        console.error('Error sending data to n8n:', error.message);
        res.status(500).json({ error: 'Failed to send data' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
