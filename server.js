const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(__dirname));

function validateName(name) {
    if (!name || name.trim() === '') {
        return false;
    }
    const onlyNumbersRegex = /^\d+$/;
    if (onlyNumbersRegex.test(name.trim())) {
        return false;
    }
    return true;
}

function validatePassword(password) {
    if (!password || password.length < 10) {
        return false;
    }
    const hasLetter = /[a-zA-Z]/;
    const hasNumber = /\d/;
    return hasLetter.test(password) && hasNumber.test(password);
}

function validateIDNumber(idNumber) {
    if (!idNumber || idNumber.trim() === '') {
        return false;
    }
    
    idNumber = idNumber.trim();
    
    if (/\./.test(idNumber)) {
        return false;
    }
    
    const invalidCharsRegex = /[^0-9-]/;
    if (invalidCharsRegex.test(idNumber)) {
        return false;
    }
    
    const dashPatternRegex = /^\d{3}(-?\d{3}){3}$/;
    const cleanPattern = idNumber.replace(/-/g, '');
    
    if (cleanPattern.length !== 12) {
        return false;
    }
    
    if (idNumber.includes('-')) {
        return dashPatternRegex.test(idNumber);
    }
    
    return /^\d{12}$/.test(idNumber);
}

function maskPassword(password) {
    return '*'.repeat(password.length);
}

function cleanIDNumber(idNumber) {
    return idNumber.replace(/[-.]/g, '');
}

function saveToFile(data) {
    const filePath = path.join(__dirname, 'accessresults.txt');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}]\nName: ${data.name}\nPassword: ${data.maskedPassword}\nID: ${data.cleanedID}\nStatus: ${data.status}\nDetails: ${data.displayDetails}\n${'='.repeat(60)}\n`;
    
    fs.appendFile(filePath, logEntry, (err) => {
        if (err) {
            console.error('Error saving to file:', err);
        } else {
            console.log('Results saved to accessresults.txt');
        }
    });
}

function readResultsFromFile(callback) {
    const filePath = path.join(__dirname, 'accessresults.txt');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err && err.code === 'ENOENT') {
            callback('No previous results found.');
        } else if (err) {
            callback('Error reading results file.');
        } else {
            callback(data);
        }
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'protectaccess.html'));
});

app.post('/protectaccess', (req, res) => {
    const { name, pw, IDnumber } = req.body;
    
    const isValidName = validateName(name);
    const isValidPassword = validatePassword(pw);
    const isValidID = validateIDNumber(IDnumber);
    
    let status = '';
    let statusClass = '';
    let displayMessage = '';
    let maskedPw = maskPassword(pw);
    let cleanedID = cleanIDNumber(IDnumber);
    
    if (isValidName && isValidPassword && isValidID) {
        status = 'Successful';
        statusClass = 'success';
        displayMessage = `${name}, ${maskedPw}, ${cleanedID}`;
    } else {
        status = 'Access Denied Invalid Data';
        statusClass = 'error';
        displayMessage = `${name}, ${maskedPw}, ${cleanedID}`;
    }
    
    const resultData = {
        name: name || '',
        maskedPassword: maskedPw,
        cleanedID: cleanedID,
        status: status,
        displayDetails: displayMessage,
        rawID: IDnumber || '',
        validations: {
            nameValid: isValidName,
            passwordValid: isValidPassword,
            idValid: isValidID
        }
    };
    
    saveToFile(resultData);
    
    readResultsFromFile((fileContent) => {
        const htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Validation Result</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    max-width: 600px;
                    width: 100%;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .success {
                    color: green;
                }
                .error {
                    color: red;
                }
                .details {
                    font-size: 18px;
                    text-align: center;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .back-link {
                    display: block;
                    text-align: center;
                    margin-top: 20px;
                    color: #667eea;
                    text-decoration: none;
                }
                .back-link:hover {
                    text-decoration: underline;
                }
                .validation-details {
                    font-size: 14px;
                    color: #666;
                    margin-top: 20px;
                    padding: 10px;
                    background: #f9f9f9;
                    border-radius: 5px;
                }
                .validation-details ul {
                    margin: 5px 0;
                }
                .summary {
                    text-align: center;
                    font-size: 16px;
                    margin-bottom: 15px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="${statusClass}">${status}</h1>
                <p class="summary">Submitted details:</p>
                <div class="details">
                    ${displayMessage}
                </div>
                <div class="validation-details">
                    <strong>Validation Summary:</strong>
                    <ul>
                        <li>Name: ${isValidName ? '✓ Valid' : '✗ Invalid (empty or numbers only)'}</li>
                        <li>Password: ${isValidPassword ? '✓ Valid' : '✗ Invalid (min 10 chars, letters + numbers)'}</li>
                        <li>ID Number: ${isValidID ? '✓ Valid' : '✗ Invalid (12 digits, optional dashes every 3 digits, no dots)'}</li>
                    </ul>
                </div>
                <a href="/" class="back-link">← Back to Registration Form</a>
            </div>
        </body>
        </html>
        `;
        
        res.send(htmlResponse);
    });
});

app.get('/view-results', (req, res) => {
    readResultsFromFile((fileContent) => {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Saved Results</title>
            <style>
                body {
                    font-family: monospace;
                    padding: 20px;
                    background: #f4f4f4;
                }
                pre {
                    background: white;
                    padding: 15px;
                    border-radius: 5px;
                    overflow-x: auto;
                }
                h1 {
                    color: #333;
                }
                .back-link {
                    display: inline-block;
                    margin-top: 20px;
                    color: #667eea;
                }
            </style>
        </head>
        <body>
            <h1>Access Results History</h1>
            <pre>${fileContent}</pre>
            <a href="/" class="back-link">← Back to Registration</a>
        </body>
        </html>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
});