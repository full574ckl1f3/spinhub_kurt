var DYNAMO_HELPER = (function(){



	var
		expose = {
			isPenTitleLegacy,
			removeComponent,
			updateComponent
		}, hide = {

		};

	var ddb_params = {
		region: CONFIG.DYNAMO.REGION_STR,
		apiVersion: CONFIG.DYNAMO.API_VERSION_STR
	};

	if(CONFIG.ENV_STR === "development"){
		ddb_params.profile = "fullstacklife";
	}

	var
		{
			DynamoDBClient,
			GetItemCommand,
			UpdateItemCommand
		} = require("@aws-sdk/client-dynamodb"),                   
		API_DDBClient = new DynamoDBClient(ddb_params);



	(function _init(){
		if(process.env.NODE_ENV === "development" 
				|| process.env.NODE_ENV === "test"
				|| process.env.NODE_ENV === "test_mode"){
			if(AWS.config.credentials === null){
				AWS.config.credentials = new AWS.SharedIniFileCredentials({
					profile: "fullstacklife"
				});
			}else{
				AWS.config.credentials.profile = "fullstacklife";
				AWS.config.credentials.refresh();
			}
		}
	})();


	async function isPenTitleLegacy(pen_title_str){
		//called from draft validate only hence code is in draft error codes
		var 
			params = {
				Key: {
					"pen_title": {
						S: pen_title_str
					}
				}, 
				TableName: CONFIG.DYNAMO.LEGACY_TABLE_NAME_STR
			};
		var cmd_str = new GetItemCommand(params);
		var data = await API_DDBClient.send(cmd_str);

		// console.log("DDB: isPenTitleLegacy data", data);
		if(data && data.Item && data.Item.spin_id && data.Item.spin_id.S){
			console.log("isPenTitleLegacy found this item", data.Item.spin_id.S, pen_title_str);
			return true;
		}else{
			//no legacy itme found for that pen_title
			return false;
		}
	}

	async function removeComponent(spin_id_str, component_name_str){
		// console.log("removeComponent", spin_id_str, component_name_str)
		// throw "not set up remove Conm"
		var attribute_to_update_str = component_name_str;

		// var attribute_value_str = valid_value_str; //all strings as faik

		var 
    	    params = {
            	Key: {
                	"spin_id": {
                    	S: spin_id_str
                	}
         		},
         		ExpressionAttributeNames: {
         			"#spin_id": "spin_id",
         			"#random": attribute_to_update_str
         		},
         		// ,
         		// ExpressionAttributeValues: {
	          //   	":random": {
	          //   		S: attribute_value_str //will NOT work unless S
	          //   	}
	          //   },
	            // ReturnValues: "ALL_NEW", //WHY ALL NEW I AM IGNORE IT in all cases
	            //in 1 case I need to get the OLD title ALL_OLD not UPDATED OLD it may be the same 
	            ReturnValues: "ALL_OLD",
	            ConditionExpression: "attribute_exists(#spin_id)",
         		UpdateExpression: "REMOVE #random",
        		// ConditionExpression: "attribute_exists(#email_address)",
         		// ReturnConsumedCapacity: "TOTAL",
            	TableName: CONFIG.DYNAMO.DRAFTS_TABLE_NAME_STR
            	// ,
            	// IndexName: CONFIG.DYNAMO.USERNAME_PASSWORD_INDEX_NAME_STR
            };

        var cmd_str = new UpdateItemCommand(params);
		var data = await API_DDBClient.send(cmd_str);

		try{
			var data = await API_DDBClient.send(cmd_str);
			// console.log("DDB.updateComponent:data2", data);
		}catch(e){
			console.log("removeComponent", e);
			throw "DDB.removeComponent:STOP HERE"
		}

		
		// DDB.updateItem(params, function(err, data){
		// // console.log("WTH", err, data);
		// 	if(err){
		// 		if(err.code === "ConditionalCheckFailedException"){
	    //  			//user not in the DB, and it shoudl be 500
	    //  			return callback("63921e99-e531-4bca-8a52-b7857c7d5c07", null);
	    //  		}else{
	    //  			console.log(err);
	    //  			throw "WTH, remove"
	    //  		}
     	// 	}
		// 	return callback(null, true); 
		// });
	}

	async function updateComponent(spin_id_str, component_name_str, valid_value_str){
		//used in many places
		var attribute_to_update_str = component_name_str;

		var attribute_value_str = valid_value_str;

		var 
    	    params = {
            	Key: {
                	"spin_id": {
                    	S: spin_id_str
                	}
         		},
         		ExpressionAttributeNames: {
         			"#spin_id": "spin_id",
         			"#random": attribute_to_update_str
         		},
         		ExpressionAttributeValues: {
	            	":random": {
	            		S: attribute_value_str //will NOT work unless S
	            	}
	            },
	            ReturnValues: "ALL_OLD", //important I think
	            ConditionExpression: "attribute_exists(#spin_id)",
         		UpdateExpression: "SET #random = :random",

        		// ConditionExpression: "attribute_exists(#email_address)",
         		// ReturnConsumedCapacity: "TOTAL",
            	TableName: CONFIG.DYNAMO.DRAFTS_TABLE_NAME_STR
            	// ,
            	// IndexName: CONFIG.DYNAMO.USERNAME_PASSWORD_INDEX_NAME_STR
            };

		if(attribute_value_str === null){
			//remove it do not update it as we cant use an empty string with DDB
			delete params.ExpressionAttributeValues[":random"];
			if( Object.keys(params.ExpressionAttributeValues).length === 0){
				delete params.ExpressionAttributeValues;
			}
			params.UpdateExpression = "REMOVE #random";
			// console.log("DDB updateComponent, remove it instead", params);
		}

		var cmd_str = new UpdateItemCommand(params);
		try{
			var data = await API_DDBClient.send(cmd_str);
			// console.log("DDB.updateComponent:data2", data);
		}catch(e){
			console.log("updateComponent", e);
			throw "DDB.updateComponent:STOP HERE"
		}

		

		return data;
		// var response = await U DDB.updateItem(params, function(err, data){
		// // console.log("WTH", err, data);
		// 	if(err){
		// 		if(err.code === "ConditionalCheckFailedException"){
	    //  			//user not in the DB, and it shoudl be 500
	    //  			return null;
	    //  			// callback("63921e99-e531-4bca-8a52-b7857c7d5c07", null);
	    //  		}else{
	    //  			console.log(err);
	    //  			return null;
	    //  		}
     	// 	}
		// 	return data;
		// });
	}

	return expose;

})();
module.exports = DYNAMO_HELPER;