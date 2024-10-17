const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'imr'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        throw err;
    }
    console.log('MySQL connected');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.session.userId; // Get user ID from session
        const userUploadsDir = path.join(__dirname, `uploads/${userId}`);
        if (!fs.existsSync(userUploadsDir)) {
            fs.mkdirSync(userUploadsDir, { recursive: true });
        }
        cb(null, userUploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const authenticateUser = (req, res, next) => {
    if (req.session && req.session.userId) { // Check if session and userId are defined
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/pdf-records', authenticateUser, (req, res) => {
    const userId = req.session.userId;
    const sql = 'SELECT id, firstName, lastName FROM register WHERE id = ?';
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('An unexpected error occurred');
        }

        if (result.length === 0) {
            return res.send('User not found');
        }

        const user = result[0];
        res.render(path.join(__dirname, 'report.html'), { firstName: user.firstName, lastName: user.lastName });
    });
});

app.get('/home', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'records.html'));
});

app.post('/login', (req, res) => {
    const { aadhar, password } = req.body;

    const sql = 'SELECT * FROM register WHERE aadhar = ?';
    db.query(sql, [aadhar], (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('An unexpected error occurred');
        }

        if (result.length === 0) {
            return res.send('User not found');
        }

        const user = result[0];
        if (user.password === password) {
            req.session.userId = user.id;
            res.redirect('/home'); // Redirect to home page after successful login
        } else {
            return res.send('Invalid username or password');
        }
    });
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', (req, res) => {
    const { firstName, lastName, aadhar, password } = req.body;

    const sql = `INSERT INTO register (firstName, lastName, aadhar, password) VALUES (?, ?, ?, ?)`;
    const values = [firstName, lastName, aadhar, password];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting record:', err);
            return res.status(500).send('An unexpected error occurred');
        }
        console.log('Record inserted');
        res.send('Record inserted');
    });
});

app.post('/upload-pdf', authenticateUser, upload.single('pdfFile'), (req, res) => {
    if (req.file) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/pdf-list', authenticateUser, (req, res) => {
    const userId = req.session.userId; // Get user ID from session
    const userUploadsDir = path.join(__dirname, `uploads/${String(userId)}`);

    fs.readdir(userUploadsDir, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Internal Server Error');
        }

        const pdfFiles = files.map(file => {
            const filePath = path.join('/pdfs', String(userId), file);
            return { filename: file, path: filePath };
        });

        res.json(pdfFiles);
    });
});

app.get('/pdfs/:userId/:filename', authenticateUser, (req, res) => {
    const userId = req.params.userId;
    const filename = req.params.filename;
    const filePath = path.join(__dirname, `uploads/${userId}/${filename}`);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('Error accessing file:', err);
            return res.status(404).send('File not found');
        }
        
        // Set the appropriate content type for PDF files
        res.contentType("application/pdf");
        
        // Send the file to the client
        res.sendFile(filePath);
    });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
