# CSYE 6225 - Fall 2020 (Lambda)

## Technology Stack
* Node JS
* Database: DynamoDB

## Build and Deploy
* Run the Github Action for creating the custom AMI from dev account
* Build the infrastructure with ```terraform apply```
* After the infrastructure is up and running, trigger the job for deployment of webapp application to EC2 instances
* This will upload the latest revision of application to the codedeploy bucket in S3 and will run the application on EC2 instance
* Run the Github workflow to deploy revised Lambda function which will also upload the latest version of lambda function to the lambda deploymnt bucket in S3

## Working
* The Lambda function will be triggered whenever a message is published to SNS
* Lambda will send the updates to user who posted the question, i.e. answer update/posted/delete via SES service
* Lambda keeps track of emails sent with the help of DynamoDB thereby avoiding duplicate emails