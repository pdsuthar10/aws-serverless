var aws = require("aws-sdk");
var ses = new aws.SES({ region: "us-east-1" });
exports.handler = async function (event) {
    let message = JSON.parse(event.Records[0].Sns.Message);
    let dataQuestion = message.question;
    let dataAnswer = message.answer;
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
        "QUESTION DETAIL\n"+
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
    var params = {
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

    return ses.sendEmail(params).promise()
};