const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Initialize local database file if it doesn't exist
if (!fs.existsSync(DATABASE_FILE)) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify({ appointments: [] }, null, 2));
}

// Helper to read data
const readData = () => {
    try {
        const data = fs.readFileSync(DATABASE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database file:', error);
        return { appointments: [] };
    }
};

// Helper to write data
const writeData = (data) => {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing to database file:', error);
        return false;
    }
};

// API Routes
app.post('/api/appointments', async (req, res) => {
    try {
        const appointmentData = req.body;
        
        // Generate a random appointment ID
        const appointmentId = 'MC-' + Math.floor(100000 + Math.random() * 900000);
        appointmentData.appointmentId = appointmentId;
        appointmentData.createdAt = new Date().toISOString();
        
        // Read existing data
        const data = readData();
        
        // Check for double booking
        const isDoubleBooked = data.appointments.some(app => 
            app.doctor === appointmentData.doctor &&
            app.appointmentDate === appointmentData.appointmentDate &&
            app.appointmentTime === appointmentData.appointmentTime
        );

        if (isDoubleBooked) {
            return res.status(409).json({
                success: false,
                message: 'This time slot is already booked for the selected doctor. Please choose another time.'
            });
        }
        
        // Add new appointment
        data.appointments.push(appointmentData);
        
        // Save back to file
        const success = writeData(data);
        
        if (success) {
            res.status(201).json({ 
                success: true, 
                message: 'Appointment booked successfully',
                appointment: appointmentData 
            });
        } else {
            throw new Error('Could not save data');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to book appointment, please try again later.',
            error: error.message 
        });
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const data = readData();
        // Sort by createdAt descending (newest first)
        const appointments = data.appointments.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        res.status(200).json({ success: true, appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Fallback route to serve the OP form main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'op.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
