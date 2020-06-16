/**** External libraries ****/
const express = require('express'); // The express.js library for implementing the API
const bodyParser = require('body-parser'); // Parsing the json request to javascript
// const morgan = require('morgan'); // For logging everything that happens in the console, good for errors
const cors = require('cors'); //Prevends app from getting C.O.R.S (cross origin recourse sharing) errors
const mongoose = require("mongoose"); //Database

/**** Configuration ****/
const appName = "Life in Czech Api"; //
const port = process.env.PORT || 8081; // Pick port 8080 if the PORT env variable is empty, Vue uses 8080.
const app = express(); // Get the express app object. An express instance

app.use(bodyParser.json()); // Add middleware that parses JSON from the request body.
// app.use(morgan('combined')); // Add middleware that logs all http requests to the console.
app.use(cors()); // Avoid CORS errors. https://en.wikipedia.org/wiki/Cross-origin_resource_sharing

(async (_) => {
  try {
    const url = process.env.CONNECTION_STRING;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
    console.log("Success!");
  } catch (error) {
    console.error("Connection failed!", error);
  }
})();
//() immediately invoked expression - runs instantly when JS finds it

const dictionarySchema = new mongoose.Schema ({
  //id: Number,
  word: String,
  translation: String,
  pronunciation: String,
  hotlist: Boolean,
  dictionarycz: Boolean,
  category: String 
}, {collection: "DictionaryCZ"});
const dictionarycz = mongoose.model("dictionaryCZ", dictionarySchema) 

/**** Routes ****/
app.get('/api/dictionarycz', async (request, response) => {
  response.json(await dictionarycz.find({}));
});

app.post('/api/dictionarycz', async(request, response) => {
  const dictionaryczIds = request.body;
  const dictionaryczWords = await (await dictionarycz.find().where('_id')).includes(dictionaryczIds).exec();
  response.json(dictionaryczWords);
});

/**** Start! ****/
app.listen(port, () => console.log(`${appName} API running on port ${port}!`));

//npm start to run index.js