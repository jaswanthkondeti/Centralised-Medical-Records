const express=require("express");
const path = require('path');
const page = express();
const port = 5000;

page.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

page.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
