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
app.use(express.static('img'));
app.use(session({
    secret: '123',
    resave: false,
    saveUninitialized: false
}));


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'imr'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected');
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDirectory = `uploads/pdf/${req.session.user.aadhar}`;
        fs.mkdirSync(userDirectory, { recursive: true });
        cb(null, userDirectory);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });


app.use('/pdfs', express.static(path.join(__dirname, 'uploads/pdf')));


app.get('/pdf-records', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'report.html'));
});


app.post('/upload-pdf', upload.single('pdfFile'), (req, res) => {
    if (req.file) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});


app.get('/pdf-list', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }
    const pdfFiles = [];
    const userPdfDirectory = path.join(__dirname, `uploads/pdf/${req.session.user.aadhar}`);

    fs.readdir(userPdfDirectory, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Internal Server Error');
        }

        files.forEach(file => {
            const filePath = path.join('/pdfs', req.session.user.aadhar, file);
            pdfFiles.push({ filename: file, path: filePath });
        });

        res.json(pdfFiles);
    });
});


app.get('/home', (req, res) => {
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
            console.log('User not found');
            return res.send('User not found');
        }

        const user = result[0];
        if (user.password === password) {
            req.session.user = user;
            console.log('User logged in:', user);
            return res.redirect('/pdf-records');
        } else {
            console.log('Invalid password for user:', user);
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
            throw err;
        }
        console.log("Recored inserted");
        res.send("You've sucessfully registered");
    });
});


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
