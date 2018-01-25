const config = require('./config')
const fb = require('firebase-admin');

fb.initializeApp({
        credential: fb.credential.cert(config.service_account),
        databaseURL: config.database_url
        });

exports.getClues = function(){
    return new Promise(function(resolve, reject){
        let database = fb.database();
        database.ref('/clues').once('value').then(function(clues) {
            return clues.val()
        }).then(function(res){
            resolve(res);
        }).catch(function(err){
            console.log("Error: ", err)
            reject();
        })
    })
}

