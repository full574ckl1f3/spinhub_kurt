
AWS = require("aws-sdk");



CONFIG = {
	OPENAI_API_KEY: "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",
	ACCOUNT_NUMBER_INT: 401295217232
};

DEEP_AI= require("deepai"); 
		

CONFIG.DEEP_AI_KEY_STR = "53d0141c-3ca5-4ff8-8279-ec5bd30089a0";
DEEP_AI.setApiKey(CONFIG.DEEP_AI_KEY_STR);

var 
	{ 
		Configuration, 
		OpenAIApi 
	} = require("openai"),
	configuration = new Configuration({
		apiKey: CONFIG.OPENAI_API_KEY,
	});


//global
OPEN_AI = new OpenAIApi(configuration);

//change for prod

if(process && process.env && process.env.NODE_ENV){
	var ALLOWED_ENVS_STR_ARR = ["development", "staging", "production"];
	CONFIG.ENV_STR = process.env.NODE_ENV;
}else{
	throw "need env";
}

CONFIG.REK = {};

if(CONFIG.ENV_STR === "development"){
	CONFIG.ENV_CAP_STR = "Development";
	CONFIG.AWS_REGION_STR = "us-east-1";
	CONFIG.SQS = {};
	CONFIG.SQS.AWS_REGION_STR = "us-east-1";
	CONFIG.S3 = {};


	console.log("Overriding for local use as development");
	if(AWS.config.credentials === null){
		AWS.config.credentials = new AWS.SharedIniFileCredentials({
			profile: "fullstacklife"
		});
	}else{
		AWS.config.credentials.profile = "fullstacklife"
		AWS.config.credentials.refresh();
	}
	CONFIG.SQS.PROFILE_STR = "fullstacklife";
	CONFIG.S3.AWS_REGION_STR = "us-east-1";
}else if(CONFIG.ENV_STR === "staging"){
	CONFIG.ENV_CAP_STR = "Staging";
	CONFIG.AWS_REGION_STR = "us-west-2";
	CONFIG.SQS = {};
	CONFIG.SQS.AWS_REGION_STR = "us-west-2";
	CONFIG.S3 = {};
	CONFIG.S3.AWS_REGION_STR = "us-west-2";
}else if(CONFIG.ENV_STR === "production"){
	CONFIG.ENV_CAP_STR = "Production";
	CONFIG.AWS_REGION_STR = "us-east-1";
	CONFIG.SQS = {};
	CONFIG.SQS.AWS_REGION_STR = "us-east-1";
	CONFIG.S3 = {};
	CONFIG.S3.AWS_REGION_STR = "us-east-1";

}else{
	throw "npo env"
}


(async function wrapper(){



	console.log("AWAITING SECRETS PRE LAUNCH", CONFIG);
	var result = "";
	var SSM = new AWS.SSM({
		apiVersion: "2014-11-06",
		region: CONFIG.AWS_REGION_STR
	});




	async function doQueueConfig(){
		console.log("Setting queue config for", CONFIG.ENV_STR);
		if(CONFIG.ENV_STR === "development"){
			CONFIG.queue_name_str = "DevelopmentKurtQueue";
			CONFIG.sqs_url_str = `https://sqs.${CONFIG.AWS_REGION_STR}.amazonaws.com/${CONFIG.ACCOUNT_NUMBER_INT.toString()}/${CONFIG.queue_name_str}`;
			CONFIG.LOOP_TIME_INT = 1; //1000 * 5; //it is using the viz timeout
		}else if(CONFIG.ENV_STR === "staging"){
			CONFIG.queue_name_str = "StagingKurtQueue";
			CONFIG.sqs_url_str = `https://sqs.${CONFIG.AWS_REGION_STR}.amazonaws.com/${CONFIG.ACCOUNT_NUMBER_INT.toString()}/${CONFIG.queue_name_str}`;
			CONFIG.LOOP_TIME_INT = 1; //1000 * 5; //it is using the viz timeout
		}else if(CONFIG.ENV_STR === "production"){
			CONFIG.queue_name_str = "ProductionKurtQueue";
			CONFIG.sqs_url_str = `https://sqs.${CONFIG.AWS_REGION_STR}.amazonaws.com/${CONFIG.ACCOUNT_NUMBER_INT.toString()}/${CONFIG.queue_name_str}`;
			CONFIG.LOOP_TIME_INT = 1; //1000 * 5; //it is using the viz timeout
		}else if(CONFIG.ENV_STR === "test"){	
			throw "nto set up for test"
		}else{
			throw "unknown env";
		}
	}

	async function doS3Config(){
		console.log("Setting s3 config for", CONFIG.ENV_STR);
		if(CONFIG.ENV_STR === "development"){
			CONFIG.S3.DRAFT_SPIN_CONTENT_STR = "development-draft-spin-content";
			CONFIG.S3.DRAFT_SPIN_IMAGES_CONTENT_STR = "development-draft-spinhub-images";					
			CONFIG.S3.VALIDATION_BUCKET_NAME_STR = "development-validation-files";
		}else if(CONFIG.ENV_STR === "staging"){
			CONFIG.S3.DRAFT_SPIN_CONTENT_STR = "staging-draft-spin-content";
			CONFIG.S3.DRAFT_SPIN_IMAGES_CONTENT_STR = "staging-draft-spinhub-images";					
			CONFIG.S3.VALIDATION_BUCKET_NAME_STR = "staging-validation-files";

		}else if(CONFIG.ENV_STR === "production"){
			CONFIG.S3.DRAFT_SPIN_CONTENT_STR = "production-draft-spin-content";
			CONFIG.S3.DRAFT_SPIN_IMAGES_CONTENT_STR = "production-draft-spinhub-images";					
			CONFIG.S3.VALIDATION_BUCKET_NAME_STR = "production-validation-files";
		}else{
			throw "unknown env";
		}
	}
	
	async function doDynamoConfig(){
		//NOT the same as FRONT BTW (facepalm)

		console.log("Setting dynamo for", CONFIG.ENV_STR);
		CONFIG.DYNAMO = {};
		if(CONFIG.ENV_STR === "development"){
			CONFIG.DYNAMO.API_VERSION_STR = "2012-08-10";
			CONFIG.DYNAMO.REGION_STR = "us-east-1";
			CONFIG.DYNAMO.PROFILE_STR = "fullstacklife";
			CONFIG.DYNAMO.USERS_TABLE_NAME_STR = "dev-spinhub-users";
			CONFIG.DYNAMO.PAYMENTS_TABLE_NAME_STR = "dev-spinhub-payments";
			CONFIG.DYNAMO.USER_SESSION_TABLE_STR = "dev-spinhub-user-sessions";
			CONFIG.DYNAMO.ENFORCEMENT_TABLE_NAME_STR = "dev-spinhub-pennames";
			CONFIG.DYNAMO.ENFORCEMENT_INDEX_NAME_STR = "dev-spinhub-pennames-email-index-2";
			CONFIG.DYNAMO.USERNAME_PASSWORD_INDEX_NAME_STR = "dev-spinhub-username-password-index";
			CONFIG.DYNAMO.USERS_INDEX_NAME_STR = "dev-spinhub-username-password-index";
			CONFIG.DYNAMO.RESET_PASSWORD_TABLE_NAME_STR = "dev-spinhub-reset-password";
			CONFIG.DYNAMO.DRAFTS_TABLE_NAME_STR = "dev-spinhub-drafts";
			CONFIG.DYNAMO.LEGACY_TABLE_NAME_STR = "dev-spinhub-legacy";
			CONFIG.DYNAMO.COIN_LOG_TABLE_NAME_STR = "dev-spinhub-coin-log";
			CONFIG.DYNAMO.COMMISSIONS_TABLE_NAME_STR = "dev-spinhub-commissions-log";
			CONFIG.DYNAMO.PROFIT_TABLE_NAME_STR = "dev-spinhub-profits-log";

		}else if(CONFIG.ENV_STR === "staging"){ //WEST
			//ALSO not set up
			console.log('FAKER stag! is not set up on Dynamo yet');
			CONFIG.DYNAMO.API_VERSION_STR = "2012-08-10";
			CONFIG.DYNAMO.REGION_STR = "us-west-1";
			CONFIG.DYNAMO.PROFILE_STR = "fullstacklife";
			CONFIG.DYNAMO.USERS_TABLE_NAME_STR = "stag-spinhub-users";
			CONFIG.DYNAMO.PAYMENTS_TABLE_NAME_STR = "stag-spinhub-payments";
			CONFIG.DYNAMO.USER_SESSION_TABLE_STR = "stag-spinhub-user-sessions";
			CONFIG.DYNAMO.ENFORCEMENT_TABLE_NAME_STR = "stag-spinhub-pennames";
			CONFIG.DYNAMO.ENFORCEMENT_INDEX_NAME_STR = "stag-spinhub-pennames-email-index-2";
			CONFIG.DYNAMO.USERNAME_PASSWORD_INDEX_NAME_STR = "stag-spinhub-username-password-index";
			CONFIG.DYNAMO.USERS_INDEX_NAME_STR = "stag-spinhub-username-password-index";
			CONFIG.DYNAMO.RESET_PASSWORD_TABLE_NAME_STR = "stag-spinhub-reset-password";
			CONFIG.DYNAMO.DRAFTS_TABLE_NAME_STR = "stag-spinhub-drafts";
			CONFIG.DYNAMO.LEGACY_TABLE_NAME_STR = "stag-spinhub-legacy";
			CONFIG.DYNAMO.COIN_LOG_TABLE_NAME_STR = "stag-spinhub-coin-log";
			CONFIG.DYNAMO.COMMISSIONS_TABLE_NAME_STR = "stag-spinhub-commissions-log";
			CONFIG.DYNAMO.PROFIT_TABLE_NAME_STR = "stag-spinhub-profits-log";

		}else if(CONFIG.ENV_STR === "production"){
			CONFIG.DYNAMO.API_VERSION_STR = "2012-08-10";
			CONFIG.DYNAMO.REGION_STR = "us-east-1";
			CONFIG.DYNAMO.PROFILE_STR = "fullstacklife",//change this to a test thing;
			CONFIG.DYNAMO.USERS_TABLE_NAME_STR = "prod-spinhub-users";
			CONFIG.DYNAMO.PAYMENTS_TABLE_NAME_STR = "prod-spinhub-payments";
			CONFIG.DYNAMO.USER_SESSION_TABLE_STR = "prod-spinhub-user-sessions";
			CONFIG.DYNAMO.ENFORCEMENT_TABLE_NAME_STR = "prod-spinhub-pennames";
			CONFIG.DYNAMO.ENFORCEMENT_INDEX_NAME_STR = "prod-spinhub-pennames-email-index-2";
			CONFIG.DYNAMO.USERNAME_PASSWORD_INDEX_NAME_STR = "prod-spinhub-username-password-index";
			CONFIG.DYNAMO.USERS_INDEX_NAME_STR = "prod-spinhub-username-password-index";
			CONFIG.DYNAMO.RESET_PASSWORD_TABLE_NAME_STR = "prod-spinhub-reset-password";
			CONFIG.DYNAMO.DRAFTS_TABLE_NAME_STR = "prod-spinhub-drafts";
			CONFIG.DYNAMO.LEGACY_TABLE_NAME_STR = "prod-spinhub-legacy";
			CONFIG.DYNAMO.COIN_LOG_TABLE_NAME_STR = "prod-spinhub-coin-log";
			CONFIG.DYNAMO.COMMISSIONS_TABLE_NAME_STR = "prod-spinhub-commissions-log";
			CONFIG.DYNAMO.PROFIT_TABLE_NAME_STR = "prod-spinhub-profits-log";

		}else if(CONFIG.ENV_STR === "test"){
			CONFIG.DYNAMO.API_VERSION_STR = "2012-08-10";
			CONFIG.DYNAMO.REGION_STR = "us-east-1";
			CONFIG.DYNAMO.PROFILE_STR = "fullstacklife",//change this to a test thing;
			CONFIG.DYNAMO.USERS_TABLE_NAME_STR = "test-spinhub-users";
			CONFIG.DYNAMO.PAYMENTS_TABLE_NAME_STR = "test-spinhub-payments";
			CONFIG.DYNAMO.USER_SESSION_TABLE_STR = "test-spinhub-user-sessions";
			CONFIG.DYNAMO.ENFORCEMENT_TABLE_NAME_STR = "test-spinhub-pennames";
			CONFIG.DYNAMO.ENFORCEMENT_INDEX_NAME_STR = "test-spinhub-pennames-email-index-2";
			CONFIG.DYNAMO.USERNAME_PASSWORD_INDEX_NAME_STR = "test-spinhub-username-password-index";
			CONFIG.DYNAMO.USERS_INDEX_NAME_STR = "test-spinhub-username-password-index";
			CONFIG.DYNAMO.RESET_PASSWORD_TABLE_NAME_STR = "test-spinhub-reset-password";
			CONFIG.DYNAMO.DRAFTS_TABLE_NAME_STR = "test-notsetup-spinhub-drafts";
			CONFIG.DYNAMO.LEGACY_TABLE_NAME_STR = "test-not-setup=spinhub-legacy";
			CONFIG.DYNAMO.COIN_LOG_TABLE_NAME_STR = "test-spinhub-coin-log";
			CONFIG.DYNAMO.COMMISSIONS_TABLE_NAME_STR = "test-spinhub-commissions-log";
			CONFIG.DYNAMO.PROFIT_TABLE_NAME_STR = "test-spinhub-profits-log";
		}else{
			throw "unknown env dynamo";
		}
	}

	async function doRedisConfig(){
		var params = {
	 		Name: "StagingSpinhubRedisMetricsHost-ip_str",
	  		WithDecryption: true
		};

		try{

			CONFIG.REDIS = {};
			CONFIG.REDIS.SPINS = {};
			params.Name = __capitalize(CONFIG.ENV_STR) + "SpinhubRedisSpinsHostStr"
			result = await SSM.getParameter(params).promise();
			CONFIG.REDIS.SPINS.HOST_STR = result.Parameter.Value;
			params.Name = __capitalize(CONFIG.ENV_STR) + "SpinhubRedisSpinsPortIntStr"
			result = await SSM.getParameter(params).promise();
			CONFIG.REDIS.SPINS.PORT_INT = Number(result.Parameter.Value);
			console.log("Setting redis config for", CONFIG.ENV_STR);
		}catch(e){
			console.log("Failed to find all redis nodes, trying again in 10 seconds", e);
			await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 2)); //try 
			await doRedisConfig();
		}
	}

	function __capitalize(word_str) {
  		return word_str[0].toUpperCase() + word_str.slice(1).toLowerCase();
	}


	async function doREKConfig(){
		console.log("Setting REK config for", CONFIG.ENV_STR);
		if(CONFIG.ENV_STR === "development"){
			// CONFIG.REK.API_VERSION_STR =
			CONFIG.REK.REGION_STR = "us-east-1";
		}else if(CONFIG.ENV_STR === "staging"){
			// CONFIG.REK.API_VERSION_STR = 
			CONFIG.REK.REGION_STR = "us-west-2";
		}else if(CONFIG.ENV_STR === "production"){
			// CONFIG.REK.API_VERSION_STR = 
			CONFIG.REK.REGION_STR = "us-east-1";
		}else if(CONFIG.ENV_STR === "test"){	
			throw "not set up for test"
		}else{
			throw "unknown env";
		}
	}

	//GO GO
	await doRedisConfig();
	await doDynamoConfig();
	await doQueueConfig();
	console.log("GOT ALL SECRETS FOR FRONT. NOW WE CAN LAUNCH", CONFIG);
	await doS3Config();
	await doQueueConfig();
	await doREKConfig();
	var throw_away_start_1 = require("./local.js");

})();

