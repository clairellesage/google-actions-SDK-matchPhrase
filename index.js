const express = require('express');
const bodyParser = require('body-parser');
const googleActions = require('actions-on-google');
const db = require('./db');

let clues = [];
let count = 999;

let ActionsSdkAssistant = googleActions.ActionsSdkApp;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/ping', (request, response) => {
    response.sendStatus(200);
});

app.post('/', (request, response) => {
    const assistant = new ActionsSdkAssistant({ request, response });
    const actionsMap = new Map();
    actionsMap.set(assistant.StandardIntents.MAIN, mainHandler);
    actionsMap.set(assistant.StandardIntents.TEXT, rawInput);
    
    assistant.handleRequest(actionsMap);
});

app.listen(8080, () => {
    console.log('app started listening on port', 8080);
});

let getClues = function(){
  return new Promise(function(resolve, reject){
    let orderedClues = [];
    db.getClues()
    .then(function(res){
    res.forEach(function(clue){
      orderedClues.push(clue);
    })
    resolve(orderedClues);
    })
  })
}

let shuffle = function(array) {
  return new Promise(function(resolve, reject){
    let counter = array.length;
    while (counter > 0) {
      let index = Math.floor(Math.random() * counter);
      counter--;
      let temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }
    resolve(array);
  })
}

let cluesHandler = function(assistant){
  if (count > 0) {
    assistant.data.prompt = clues[0].prompt;
    assistant.data.answer = clues[count].answer
    if (assistant.data.correct === true) {
      let inputPrompt = assistant.buildInputPrompt(false, `That's correct! Next clue. ${clues[count].prompt}`);
      count--;
      assistant.ask(inputPrompt);
    } else {
      let inputPrompt = assistant.buildInputPrompt(false, `Try this one. ${clues[count].prompt}`);
      count--;
      assistant.ask(inputPrompt);
    }
  } else {
    assistant.tell("Congrats! You have completed the quiz!");
  }
}

let repeatHandler = function(assistant){
  count -= 1;
  let inputPrompt = assistant.buildInputPrompt(false, `${clues[count].prompt}`, ['please say your answer now']);
  assistant.data.answer = clues[count].answer;
  assistant.ask(inputPrompt);
}

let passHandler = function(assistant){
  let inputPrompt = assistant.buildInputPrompt(false, `The answer is ${assistant.data.answer}.`, ['say next']);
  assistant.ask(inputPrompt);
}

let mainHandler = function (assistant) {
  console.log("Starting main handler")
  getClues()
  .then(function(orderedClues){
    console.log("Shuffling clues from db: ", orderedClues);
    clues = shuffle(orderedClues);
    return clues;
  })
  .then(function(clues){
    console.log("Got shuffled clues from db: ", clues);
    count = clues.length - 1;
    assistant.data.prompt = clues[0].prompt;
    assistant.data.answer = clues[0].answer;
    let inputPrompt = assistant.buildInputPrompt(false, `Pop quiz! Here's your first clue. ${clues[0].prompt}`, ['please say your answer now']);
    assistant.ask(inputPrompt);
  })
}

let rawInput = function (assistant) {
    let rawInput = assistant.getRawInput();
    if (rawInput === 'exit') {
      assistant.tell('Goodbye!')
    } else if (rawInput.toLowerCase().trim() === assistant.data.answer) {
      assistant.data.correct = true;
      cluesHandler(assistant);
    } else if (rawInput.toLowerCase().trim() === "pass") {
      passHandler(assistant);
    } else if (rawInput.toLowerCase().trim() === "repeat") {
      repeat(assistant);
    } else if (rawInput.toLowerCase().trim() === "next") {
      assistant.data.correct = false;
      cluesHandler(assistant);
    } else {
      let inputPrompt = assistant.buildInputPrompt(false, `Hmm, ${rawInput}. I don't think that's the right answer. Try again!`);
      assistant.ask(inputPrompt);
    }
}