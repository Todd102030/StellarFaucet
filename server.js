const express = require("express");
const bodyParser = require('body-parser');
const Stellar = require('stellar-sdk');
var path = require("path");
const { TransactionBuilder, Asset, Keypair, Networks, Operation } = require("stellar-sdk");

const app = express();
const port = process.env.NODE_PORT || 3000; 

var config;
var asset;
var toddAsset;
var stellarServer;
var stellarPassphrase;
var totalPaid = 0;

addressHistory = [];
ipHistory = [];

var totalPaidMan = 0;

addressHistoryMan = [];
ipHistoryMan = [];

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    
    var ipAdd = req.header("X-Real-IP") || req.connection.remoteAddress

    var htm = `
    <html>${head()}<body>
    ${styleSheet()}
    <div class='container'>
    <p>
    Enter your Stellar address below to receive a random amount between 100 and 200 Ananos. You can use the faucet once per day, so be sure to come back!
    </p>
    <form action="/" method="post">
    <label for="address">Stellar Address:</label>
    <input type="text" id="address" name="address" required><br><br>
    
    <div>Want some Todd Tokens too? (They're basically worthless, just for fun/learning)</div>
    <input type="checkbox" id="toddtoken" name="toddtoken"><label for="toddtoken">Yes please!</label><br>
    <small>Search for toddindustries.ca to add the asset to Lobstr or another wallet</small><br><br>
    <input type="button" onClick="this.form.submit(); this.disabled=true; this.value='Sending…';" value="Submit">
  </form>

    <p>
    Donation address: ${config.distributor.public}
    </p>
    <p>
    Total faucet claims today: ${addressHistory.length}/${config.totalTx} for a total of ${totalPaid} Ananos, an average of ${addressHistory.length>0?parseFloat(totalPaid/addressHistory.length).toFixed(2):0} per person
    </p>
    </div>
    </body>
    </html>
    `
    /*if (ipHistory.includes(ipAdd)) {
        res.send(wrapMessage("Sorry, you or someone on your network has already claimed from the faucet today, you'll have to come back tomorrow !"));
        return;
    }*/

    if (addressHistory.length >= config.totalTx) {
        res.send(wrapMessage(`All ${config.totalTx} transactions for the day have been sent, please come back tomorrow!`));
        return;
    }else{
        res.send(htm);
    }
  });

app.get('/manangos', (req, res) => {
    
    var ipAdd = req.header("X-Real-IP") || req.connection.remoteAddress

    var htm = `
    <html>${head()}<body>
    ${styleSheet()}
    <div class='container'>
    <p>
    Enter your Stellar address below to receive a random amount between 100 and 200 Manangos. You can use the faucet once per day, so be sure to come back!
    </p>
    <form action="/manangos" method="post">
    <label for="address">Stellar Address:</label>
    <input type="text" id="address" name="address" required><br><br>
    
    <div>Want some Todd Tokens too? (They're basically worthless, just for fun/learning)</div>
    <input type="checkbox" id="toddtoken" name="toddtoken"><label for="toddtoken">Yes please!</label><br>
    <small>Search for toddindustries.ca to add the asset to Lobstr or another wallet</small><br><br>
    <input type="button" onClick="this.form.submit(); this.disabled=true; this.value='Sending…';" value="Submit">
  </form>

    <p>
    Donation address: ${config.distributor.public}
    </p>
    <p>
    Total faucet claims today: ${addressHistoryMan.length}/${config.totalTx} for a total of ${totalPaidMan} Manangos, an average of ${addressHistoryMan.length>0?parseFloat(totalPaidMan/addressHistoryMan.length).toFixed(2):0} per person
    </p>
    </div>
    </body>
    </html>
    `
    /*if (ipHistory.includes(ipAdd)) {
        res.send(wrapMessage("Sorry, you or someone on your network has already claimed from the faucet today, you'll have to come back tomorrow !"));
        return;
    }*/

    if (addressHistoryMan.length >= config.totalTx) {
        res.send(wrapMessage(`All ${config.totalTx} transactions for the day have been sent, please come back tomorrow!`));
        return;
    }else{
        res.send(htm);
    }
  });

app.post('/', async (req, res) => {
    var toAddress = req.body.address;
    var sendTodd = req.body.toddtoken;
    var ipAdd = req.header("X-Real-IP") || req.connection.remoteAddress
    console.log('Received Request: ' + ipAdd + ", " + toAddress);

    if (addressHistory.length >= config.totalTx) {
        res.send(wrapMessage(`All ${config.totalTx} transactions for the day have been sent, please come back tomorrow!`));
        return;
    }

    if (addressHistory.includes(toAddress)) {
        res.send(wrapMessage("Sorry, you've already claimed from the faucet today, you'll have to come back tomorrow !"));
        return;
    }

    if (ipHistory.includes(ipAdd)) {
        res.send(wrapMessage("Sorry, you've already claimed from the faucet today, you'll have to come back tomorrow !"));
        return;
    }
    addressHistory.push(req.body.address);
    ipHistory.push(ipAdd);

    var account = await stellarServer.loadAccount(config.distributor.public)
    var fee = await stellarServer.fetchBaseFee();
    fee += 200;
    var randomAmount = Math.floor(Math.random()*100+100)+"";

    var failed = true;

    failed = await sendTokens(res, account, asset, randomAmount, fee, toAddress, sendTodd);

    
    if (failed){
        addressHistory.pop();
        ipHistory.pop();
    }else{
        totalPaid += parseInt(randomAmount);
    }
});

app.post('/manangos', async (req, res) => {
    var toAddress = req.body.address;
    var sendTodd = req.body.toddtoken;
    var ipAdd = req.header("X-Real-IP") || req.connection.remoteAddress
    console.log('Received Request: ' + ipAdd + ", " + toAddress);

    if (addressHistoryMan.length >= config.totalTx) {
        res.send(wrapMessage(`All ${config.totalTx} transactions for the day have been sent, please come back tomorrow!`));
        return;
    }

    if (addressHistoryMan.includes(toAddress)) {
        res.send(wrapMessage("Sorry, you've already claimed from the faucet today, you'll have to come back tomorrow !"));
        return;
    }

    if (ipHistoryMan.includes(ipAdd)) {
        res.send(wrapMessage("Sorry, you've already claimed from the faucet today, you'll have to come back tomorrow !"));
        return;
    }
    addressHistoryMan.push(req.body.address);
    ipHistoryMan.push(ipAdd);

    var account = await stellarServer.loadAccount(config.distributor.public)
    var fee = await stellarServer.fetchBaseFee();
    fee += 200;
    var randomAmount = Math.floor(Math.random()*100+100)+"";

    var failed = true;

    failed = await sendTokens(res, account, manangoAsset, randomAmount, fee, toAddress, sendTodd);

    
    if (failed){
        addressHistoryMan.pop();
        ipHistoryMan.pop();
    }else{
        totalPaidMan += parseInt(randomAmount);
    }
});

async function sendTokens(res, account, tokenAsset, tokenAmt, fee, toAddress, sendTodd){
    var localFailed = true;
    try {
        console.log("Sending amount: " + tokenAmt + " to " + toAddress);
        if(sendTodd){
            console.log("Sending Todd Tokens as well to: " + toAddress);
        }

        var transaction;
        if(!sendTodd){
            transaction = new TransactionBuilder(
                account, 
                { 
                    fee, 
                    networkPassphrase: stellarPassphrase
                }
            )
            .addOperation(Operation.payment({
                destination: toAddress,
                asset: tokenAsset,
                amount: tokenAmt
                //amount: config.amountToSend
            }))
            .setTimeout(30)
            .build();
        }
        else{
            transaction = new TransactionBuilder(
                account, 
                { 
                    fee, 
                    networkPassphrase: stellarPassphrase
                }
            )
            .addOperation(Operation.payment({
                destination: toAddress,
                asset: tokenAsset,
                amount: tokenAmt
                //amount: config.amountToSend
            }))
            .addOperation(Operation.payment({
                destination: toAddress,
                asset: toddAsset,
                amount: "1000"
                //amount: config.amountToSend
            }))
            .setTimeout(30)
            .build();
            
        }
        
    } catch(error) {
        localFailed = true;
        console.log(error);
        res.send(wrapMessage("There was an error with sending to your address, please try again."));
    }

    var pair = Stellar.Keypair.fromSecret(config.distributor.private);
    transaction.sign(pair);

    try {
        const result = await stellarServer.submitTransaction(
            transaction,
            {
                skipMemoRequiredCheck: true
            }
        );
        console.log(result)
        localFailed = false;
        if(sendTodd){
            res.send(wrapMessage(`${tokenAmt} ${tokenAsset.code} tokens and 1000 Todd Tokens sent to ${toAddress}!`));
        }else{
            res.send(wrapMessage(`${tokenAmt} ${tokenAsset.code} tokens sent to ${toAddress}!`));
        }

    } catch (err) {
        localFailed = true;
        console.log(err);
        console.log("ERROR: " + JSON.stringify(err.response.data.extras));
        var ex = err.response.data.extras;
        console.log(ex.result_codes.transaction);
        console.log(ex.result_codes.operations);
        if(ex.result_codes.transaction=="tx_failed" && ex.result_codes.operations.length>0 && ex.result_codes.operations[0]=="op_no_trust"){
            res.send(wrapMessage("You need to set up a trustline with Ananos to receive from the faucet. Check out this <a href='https://www.reddit.com/r/ananos/comments/pt9skz/ananos_lobstr_and_you_a_beginners_guide_to_ananos/'>reddit post</a> for assistance."));
        }
        else{
            res.send(wrapMessage("Error sending transaction, please try again"));
        }
    }
    return localFailed;
}

app.listen(port, () => {
    parseFile(path.resolve(__dirname, "faucetconfig.json"));
    console.log(`Listening on port ${port}`);
});

function parseFile(name) {
    var fs = require('fs');
    config = JSON.parse(fs.readFileSync(name, 'utf8'));

    asset = new Asset(config.asset.name, config.asset.issuer);
    toddAsset = new Asset(config.toddAsset.name, config.toddAsset.issuer);
    manangoAsset = new Asset(config.manangoAsset.name, config.manangoAsset.issuer);

    stellarServer = new Stellar.Server(
        config.public ? 
            "https://horizon.stellar.org" 
            : "https://horizon-testnet.stellar.org"
        );

    stellarPassphrase = config.public ? Networks.PUBLIC : Networks.TESTNET;
}

function wrapMessage(msg){
    var htm = `
    <html>${head()}<body>
        ${styleSheet()}
        <div class='container'>
        <div class="msgBox">
            ${msg}
        </div>
        </div>
    </body></html>
    `
    
    return htm;
}

function styleSheet() {
    var htm = `
        <style>
            html{
                margin: 0;
                padding: 0;
            }
            body{
                margin: 0;
                padding: 0;
                text-align: center;
                font-family: Helvetica, Arial, Sans-serif;
                word-break: break-word;
                background-color: #eee;
            }
            .container{
                margin-top:2rem;
                width: auto;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
                background-color: white;
                padding: 0.5rem;
                box-shadow: 0px 0px 10px 2px grey;
            }
            .msgBox{
                margin: 4rem;
                
                padding: 1rem;
                word-break: break-word;
                text-align: center;
            }
        </style>
        `
    return htm;
}


function head(){
    var htm = `
    <title>Feed Me Ananos Faucet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    </head>
    `
    return htm;
}
