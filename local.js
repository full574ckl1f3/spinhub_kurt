console.log("start kurt polling");
var BACKGROUND = require("./background.js");

//global
REDIS_SPINS_HELPER = require("./libs/redis_spins_helper.js");
DYNAMO_HELPER = require("./libs/dynamo_helper.js");

var sqs_params = {};

sqs_params.region = CONFIG.SQS.AWS_REGION_STR;


 			
	if(CONFIG.ENV_STR === "development"){ 	
		sqs_params.profile = CONFIG.SQS.PROFILE_STR;
	};

var
	{
		DeleteMessageCommand,
		ReceiveMessageCommand,
		SQSClient
	} = require("@aws-sdk/client-sqs"),                   
	API_SQSClient = new SQSClient(sqs_params);
	





	async function init(){
		var 
			params = {
	            // MaxNumberOfMessages: 1,  //already set i think
	            // VisibilityTimeout: 60, //already set i think
	            // MessageAttributeNames: ["All"], //not needed
	            QueueUrl: CONFIG.sqs_url_str
	            // WaitTimeSeconds: 20 //already set tho
		     };
		    
	    var cmd = new ReceiveMessageCommand(params);
		try{
			var time_now_date = new Date();//.getTime();
			var response = await API_SQSClient.send(cmd);
			if(response.Messages && response.Messages[0] && response.Messages[0].Body){	
				var payload = JSON.parse(response.Messages[0].Body);
				var handle_id_str = response.Messages[0].ReceiptHandle;
				await _processThisFF(time_now_date, payload, handle_id_str);
			}else{
				console.log(time_now_date + ":No message to process, hide this");
			}
			// console.log("singlePoll info: ", response);
			// console.log("singlePoll:OK");
			init();
		}catch(e){
			console.log("Poll:FAILED");	
			console.log(e);
			await new Promise(resolve => setTimeout(resolve, CONFIG.LOOP_TIME_INT));
			init();
		}
	}

	async function _processThisFF(time_now_date, o, handle_id_str){
		console.log(time_now_date + "_processThisFF: I will start to process this now, bit not waiting for it");
		console.log("_processThisFF", o, handle_id_str);
		//FF
		var worked_boo = await BACKGROUND.processThisFF(o);
			
		if(worked_boo === false){
			return false;
		}else{
			await removeFromQueue(handle_id_str);
		}
	}


	async function removeFromQueue(handle_id_str){
		var 
			params = {
				QueueUrl: CONFIG.sqs_url_str,
	      		ReceiptHandle: handle_id_str
		    };
	    var cmd = new DeleteMessageCommand(params);
		try{
			var time_now_date = new Date();//.getTime();
			var response = await API_SQSClient.send(cmd);
			
			console.log("removeFromQueue info: ", response);
			console.log("removeFromQueue:OK");
		}catch(e){
			console.log("removeFromQueue:FAILED");	
			console.log(e);
		}
	}

	(async function (){
		await BACKGROUND.getKeyphrasesIntoMemory();
		console.log("Now we have creds, we can start polling on launch", CONFIG);
		await init();
	})();

console.log("ok carry on polling...");
