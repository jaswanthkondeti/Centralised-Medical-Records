const express = require('express'); 
const app = express(); 
const port = 4000; 
app.use(express.static('static'));  
app.get()
app.listen(port, () => { 
  console.log(`Server is running on http://localhost:${port}`); 
});