const express = require('express');
const bodyParser = require('body-parser');
const googleActions = require('actions-on-google');
const db = require('./db');

const clues = [];
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
    console.log("Here's the array: ", array)
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
      let inputPrompt = assistant.buildInputPrompt(false, `The answer is ${assistant.data.answer}. Try this one. ${clues[count].prompt}`);
      count--;
      assistant.ask(inputPrompt);
    }
  } else {
    assistant.tell("Congrats! You have completed the quiz!");
  }
}

let mainHandler = function (assistant) {
  getClues()
  .then(function(orderedClues){
    for (var c in clues){
      clues.pop(c);
    }
    var ordered = shuffle(orderedClues)
    clues.splice(0, clues.length, ...orderedClues)
    return clues;
  })
  .then(function(clues){
    count = clues.length - 1;
    assistant.data.prompt = clues[0].prompt;
    assistant.data.answer = clues[0].answer;
    let inputPrompt = assistant.buildInputPrompt(false, `Pop quiz! Here's your first clue. ${clues[0].prompt}`, [`What is ${clues[0].prompt}`]);
    assistant.ask(inputPrompt);
  })
}

let rawInput = function (assistant) {
    let userInput = assistant.getRawInput();
    if (userInput === 'exit') {
      assistant.tell('Goodbye!')
    } else if (userInput.toLowerCase().trim() === assistant.data.answer) {
      assistant.data.correct = true;
      cluesHandler(assistant);
    } else if (userInput.toLowerCase().trim() === "next") {
      assistant.data.correct = false;
      cluesHandler(assistant);
    } else {
      let inputPrompt = assistant.buildInputPrompt(false, `Hmm, ${userInput}. I don't think that's the right answer. Try again or say 'next'!`);
      assistant.ask(inputPrompt);
    }
}