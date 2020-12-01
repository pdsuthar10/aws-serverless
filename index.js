var aws = require("aws-sdk");
var ses = new aws.SES({ region: "us-east-1" });
var dynamo = new aws.DynamoDB.DocumentClient();
var crypto = require('crypto');

exports.handler = (event, context, callback) => {
    let message = JSON.parse(event.Records[0].Sns.Message);
    // let message = {
    //     question: {
    //         question_id: "437d50d4-2af0-4389-9498-8fb4541711a5",
    //         question_text: "Question by Priyam?"
    //     },
    //     answer: {
    //         answer_id: "12341234",
    //         answer_text: "Test"
    //     },
    //     user: {
    //         first_name: "Sample",
    //         last_name: "Test"
    //     },
    //     ToAddresses: {
    //         first_name: "QuestionUser"
    //     }
    // }
    let dataQuestion = message.question;
    let dataAnswer = message.answer;
    let newObject = {
        question_user_id : message.ToAddresses.id,
        question_id: dataQuestion.question_id,
        answer_user_id: message.user.id,
        answer_id: dataAnswer.answer_id,
        answer_text: message.updatedAnswerText,
        type: message.type
    };
    let stringToHash = message.ToAddresses.id+","+dataQuestion.question_id+","+
        message.user.id+","+dataAnswer.answer_id+","+message.updatedAnswerText+","+message.type;
    if(message.type === 'POST'){
        stringToHash = message.ToAddresses.id+","+dataQuestion.question_id+","+
            message.user.id+","+dataAnswer.answer_text+","+message.type;
    }
    let shasum = crypto.createHash('sha256');
    shasum.update(stringToHash)
    let calculatedHash = shasum.digest('hex');
    let searchParams = {
        TableName: "csye6225",
        Key: {
            "email_hash": calculatedHash
        }
    };
    console.log("Checking if record already present in db");
    dynamo.get(searchParams, function(error, retrievedRecord){
        console.log("in here")
        if(error){
            console.log("Error in DynamoDB get method ",error);
        }else{
            console.log("Success in get method dynamoDB", retrievedRecord);
            console.log(JSON.stringify(retrievedRecord));
            let found = false;
            if (retrievedRecord.Item == null || retrievedRecord.Item == undefined) {
                found = false;
            }else {
                if (retrievedRecord.Item.ttl > Math.floor(Date.now() / 1000)) {
                    found = true;
                }
            }
            if(!found){
                const current = Math.floor(Date.now() / 1000)
                let timeToLive = 60 * 4
                if(message.type === 'POST') timeToLive = 60 * 60 * 24 * 10
                const expireWithIn = timeToLive + current
                const params = {
                    Item: {
                        email_hash: calculatedHash,
                        ttl: expireWithIn,
                        question_user_id: newObject.question_user_id,
                        question_id: newObject.question_id,
                        answer_user_id: newObject.answer_user_id,
                        answer_id: newObject.answer_id,
                        time_created: new Date().getTime(),
                        type: newObject.type
                    },
                    TableName: "csye6225"
                }

                dynamo.put(params, function (error, data){
                    if(error) console.log("Error in putting item in DynamoDB ", error)
                    else{
                        // console.log("Success", data);
                        let updateTemplate= "";
                        let apiTemplate = "";
                        let oldTemplate = "";
                        let newAnswerTemplate = "";
                        if(message.type === "POST")
                            updateTemplate = "An answer is posted to your question by ";
                        else if(message.type === "UPDATE"){
                            updateTemplate = "An answer posted to your question was updated by ";
                            oldTemplate = "Old ";
                            newAnswerTemplate = "Updated Answer Text: "+message.updatedAnswerText+"\n"
                        }else
                            updateTemplate = "An answer posted to your question was deleted by ";

                        if(message.type === "POST")
                            apiTemplate = "Click here to view your question: http://"+message.questionGetApi+"\n"+
                                "Click here to view answer posted: http://"+message.answerGetApi+"\n"
                        else if(message.type === "UPDATE")
                            apiTemplate = "Click here to view your question: http://"+message.questionGetApi+"\n"+
                                "Click here to view updated answer: http://"+message.answerGetApi+"\n"

                        let data = "Hello "+ message.ToAddresses.first_name +",\n"+
                            updateTemplate + message.user.first_name+".\n\n"+
                            "QUESTION DETAILS\n"+
                            "------------------------------------------\n"+
                            "Question ID: "+dataQuestion.question_id+"\n"+
                            "Question Text: "+dataQuestion.question_text+"\n"+
                            "------------------------------------------\n"+
                            "------------------------------------------\n\n"+
                            "ANSWER DETAILS\n"+
                            "------------------------------------------\n"+
                            "Answer ID: "+dataAnswer.answer_id+"\n"+
                            oldTemplate+"Answer Text: "+dataAnswer.answer_text+"\n"+
                            newAnswerTemplate+
                            "Answered By: "+message.user.first_name+" "+message.user.last_name+"\n"+
                            "------------------------------------------\n"+
                            "------------------------------------------\n\n"+
                            apiTemplate+
                            "Thank you!\n\n"+
                            "NOTE: THIS IS AN AUTOMATED MAIL. PLEASE DO NOT REPLY DIRECTLY TO THIS MAIL."+
                            "IF YOU HAVE ANY COMPLAINTS OR QUESTIONS, PLEASE CONTACT US AT suthar.p@northeastern.edu"


                        //check dynamoDB
                        var emailParams = {
                            Destination: {
                                ToAddresses: [message.ToAddresses.username],
                            },
                            Message: {
                                Body: {
                                    Text: { Data: data
                                    },
                                },

                                Subject: { Data: "Question Notification" },
                            },
                            Source: "no-reply@dev.suthar-priyam.me",
                        };

                        let sendEmailPromise = ses.sendEmail(emailParams).promise()
                        sendEmailPromise
                            .then(function(result) {
                                console.log(result);
                            })
                            .catch(function(err) {
                                console.error(err, err.stack);
                            });
                    }
                })
            }else console.log("Item already present. No email sent!")
        }
    })
    console.log("in end")
};