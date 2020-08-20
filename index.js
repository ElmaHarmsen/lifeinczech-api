/**** External libraries ****/
const express = require('express'); // The express.js library for implementing the API
const bodyParser = require('body-parser'); // Parsing the json request to javascript
// const morgan = require('morgan'); // For logging everything that happens in the console, good for errors
const cors = require('cors'); //Prevends app from getting C.O.R.S (cross origin recourse sharing) errors
const mongoose = require("mongoose"); //Database
const { request, response } = require('express');

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
  if (result) {
    response.status(200).send(message);
  }
  else {
    response.status(404).send("System Fail!")
  }
});

app.put('/api/dictionarycz', async (request, response) => {
  const editedWord = request.body.editedWord; //We get the data from the request into this data variable. Object
  let message = "";
  if (!editedWord) { //If editedWord is false value. If there is nothing in the body, this will trigger.
    message = "Stop Breaking My System!";
    response.status(401).send(message); //Unauthorised. Request without a body, for example empty input field => frontend.
  } //If there is a body, this if statement will not even trigger.
  const result = await dictionarycz.findOneAndReplace({_id: request.body.id}, editedWord); 
  //Here it checks if the requested id is available, and if it does exist it replaces it.
  if (!result) {
    message = "System Fail!";
    response.status(404).send(message);
  }
  message = "Word Edited and Saved!";
  response.status(200).send(message);
});

app.get('/api/search', async (request, response) => {
  let message = "";
  const searchQuery = request.query.word; //We save the value of the search in the const.
  if (!searchQuery) { //Similar to put request above here.
    message = "Stop Breaking My System!";
    response.status(401).send(message);
  }
  const matchingRule = new RegExp(searchQuery, "i"); //To make it case insensitive.
  const result = await dictionarycz.find().or([{ word: { $regex: matchingRule } }, { translation: { $regex: matchingRule } }, { nederlands: { $regex: matchingRule } }]).exec(); //It either checks for the czech one, the english one or the dutch one.
  if (!result || !result.length) {
    message = "Nothing found!";
    response.status(404).send(message);
  }
  message = `${result.length} word(s) found!`;
  response.json({result, message});
});

/**** Start! ****/
app.listen(port, () => console.log(`${appName} API running on port ${port}!`));

//npm start to run index.js