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
  nederlands: String,
  hotlist: Boolean,
  dictionary: Boolean,
  category: String 
}, {collection: "DictionaryCZ"});
const dictionarycz = mongoose.model("dictionaryCZ", dictionarySchema) 

/**** Routes ****/
app.get('/api/dictionarycz', async (request, response) => {
  response.json(await dictionarycz.find({}));
});

app.post('/api/dictionarycz', async (request, response) => {
  const {hotlist} = request.body; //We extract the hotlist value from the body
  const dictionaryczNewWord = new dictionarycz ({...request.body}); //Creates a new instance of the model, and it destructures the request and takes the data from it.
  await dictionaryczNewWord.save(); //save is a mongoose thing?
  response.json({
    message: "Word Added!", 
    place: hotlist ? "/" : "/dictionary" //If else statement with redirecting using router paths
  });
});

app.delete('/api/dictionarycz', async (request, response) => {
  const result = await dictionarycz.deleteOne({_id: request.body.id}); //dictionarycz is the model.
  if (!result.deletedCount) {
    response.status(404).send("System Fail!");
  }
  else {
    response.status(200).send("Word Deleted!");
  }
});

app.patch('/api/dictionarycz', async (request, response) => {
  console.log("running")
  const newPlace = {hotlist: false, dictionary: false}; //Object
  let message = "";
  if (request.body.newPlace === "Hotlist") {
    newPlace.hotlist = true;
    message = "Sent to Hotlist!";
  }
  else {
    newPlace.dictionary = true;
    message = "Sent to Dictionary!";
  }
  const result = await dictionarycz.findOneAndUpdate({_id: request.body.id}, newPlace); //newPlace is also an object.
  console.log(result);
  if (result) {
    response.status(200).send(message);
  }
  else {
    response.status(404).send("System Fail!")
  }
});

/**** Start! ****/
app.listen(port, () => console.log(`${appName} API running on port ${port}!`));

//npm start to run index.js