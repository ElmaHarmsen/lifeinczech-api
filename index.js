/**** External libraries ****/
require("dotenv").config();
const express = require('express'); // The express.js library for implementing the API
const bodyParser = require('body-parser'); // Parsing the json request to javascript
// const morgan = require('morgan'); // For logging everything that happens in the console, good for errors
const cors = require('cors'); //Prevends app from getting C.O.R.S (cross origin recourse sharing) errors
const mongoose = require("mongoose"); //Database
const cookieParser = require("cookie-parser");

const bcrypt = require("bcryptjs"); //Makes hash out of passwords
const jwt = require("jsonwebtoken"); //Generates json web tokens
const validate = require("express-jwt"); //Validates if jwt is still valid

/**** Configuration ****/
const appName = "Life in Czech Api"; //
const port = process.env.PORT || 8081; // Pick port 8080 if the PORT env variable is empty, Vue uses 8080.
const app = express(); // Get the express app object. An express instance

app.use(bodyParser.json()); // Add middleware that parses JSON from the request body.
// app.use(morgan('combined')); // Add middleware that logs all http requests to the console.
app.use(cors({
  origin: "http://localhost:8080",
  credentials: true
})); // Avoid CORS errors. https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
app.use(cookieParser());

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
  word: String,
  translation: String,
  nederlands: String,
  hotlist: Boolean,
  dictionary: Boolean,
  category: String 
}, { collection: "DictionaryCZ" });
const dictionarycz = mongoose.model("dictionaryCZ", dictionarySchema);

const dictionaryUser = new mongoose.Schema ({
  username: String,
  fullName: String,
  password: String
}, { collection: "DictionaryUsers" });
const user = mongoose.model("dictionaryUser", dictionaryUser);

/**** When a new user goes through the resigration, a new mongoose modal (within DictionaryCZ?) is created! ****/

/* 
const userSchema = new Schema({ name: String })
const User = mongoose.model('User', userSchema);

User.createCollection().then(function(collection) {
  console.log('Collection is created!');
}); 
*/

/**** Routes ****/
app.post("/api/register", async(request, response) => {
  const { username, fullName, password } = request.body; //Get 3 consts from the body

  if (!username || !fullName || !password) {
    response.status(401).send("Username, full name and password are required to continue.");
    return;
  }

  const userCheck = await user.find({
    username: username
  }).exec();
  if (userCheck.length) {
    response.status(401).send("Username already exists, try another one please.");
    return;
  }

  bcrypt.genSalt((error, salt) => {
    bcrypt.hash(password, salt, async (error, hashedPassword) => {
      const newUser = new user ({
        username: username,
        fullName: fullName,
        password: hashedPassword
      });
      await newUser.save();

      const token = jwt.sign({ username, fullName }, process.env.JWT_SECRET, { expiresIn: "1h" });

      response.status(200)
      .cookie(
        "token", "Bearer " + token, { expires: new Date(Date.now() + 3600000), httpOnly: true, secure: true }
      )
      .json({
        userData: {
          username: username,
          fullName: fullName
        },
        message: `Hii ${username}, welcome to the Ducky Dictionary!`
      });
    });
  });
  //The salt thing adds once a random set of characters to the password
});

app.get("/api/session",
  validate({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
    getToken: function fromHeaderOrQuerystring (req) {
      if (req.cookies && req.cookies.token) {
        return req.cookies.token.split(" ")[1];
      }
      return null;
    }
  }),
  (request, response) => {
    response.status(200)
    .json({
      userData: {
        username: request.user.username,
        fullName: request.user.fullName
      },
      message: "Session is valid."
    });
  }
)

app.post("/api/login", async(request, response) => {
  const {username, password} = request.body;
  if (!username || !password) {
    response.status(401).send("Please fill in the credentials.");
    return;
  }
  const userCheck = await user.find({
    username: username
  }).exec();
  if (!userCheck.length) {
    response.status(404).send("User not found.");
    return;
  }
  bcrypt.compare(password, userCheck[0].password, (error, isMatching) => {
    if (!isMatching) {
      response.status(401).send("Password is incorrect, please try again.");
      return;
    }
    const token = jwt.sign({ username, fullName: userCheck[0].fullName }, process.env.JWT_SECRET, { expiresIn: "1h" });
    response.status(200)
    .cookie(
      "token", "Bearer " + token, { expires: new Date(Date.now() + 3600000), httpOnly: true, secure: true }
    )
    .json({
      userData: {
        username: username,
        fullName: userCheck[0].fullName
      },
      message: "You succesfully logged in!",
    });
  });
});

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