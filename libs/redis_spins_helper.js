var REDIS_SPINS_HELPER = (function(){

	var 
		RC_SPINS = {},
		REDIS = require("redis");


	var host_str = CONFIG.REDIS.SPINS.HOST_STR;
	var port_int = CONFIG.REDIS.SPINS.PORT_INT;

	RC_SPINS = REDIS.createClient({
		url: "redis://" + host_str + ":" + port_int.toString()
	});


	RC_SPINS.on("ready", function(){
		console.log("Redis SPINS Ready");
	});
	RC_SPINS.on("connect", function(){
		console.log("Redis SPINS Connected");
	});
	RC_SPINS.on("error", function(err){
		console.log("Redis SPINS Uncaught error, subscription db is not connected", host_str, port_int.toString());
	});

	RC_SPINS.connect();


	var 
		expose = {
			isLookupTitleUnique
		}, hide = {

		};

	async function isLookupTitleUnique(penname_str, title_with_underscores_str, spin_id_str){
		// console.log("isLookupTitleUnique doing this MUTLI WRING");
		// var MULTI = RC_SPINS.MULTI();
		var promise_obj_arr = [];

		var draft_key_str = "draft_lookup:" + penname_str + ":" + title_with_underscores_str; //penname Live
		var scheduled_key_str = "scheduled_lookup:" + penname_str + ":" + title_with_underscores_str;
		var live_key_str = "lookup:" + penname_str + ":" + title_with_underscores_str;


		promise_obj_arr.push(RC_SPINS.GET(draft_key_str));
		promise_obj_arr.push(RC_SPINS.GET(scheduled_key_str));
		promise_obj_arr.push(RC_SPINS.GET(live_key_str));
		
		// var raw_result_or_err_arr = await MULTI.EXEC();

		var raw_result_or_err_arr = await Promise.all(promise_obj_arr);

		if( (raw_result_or_err_arr[0] === null) && (raw_result_or_err_arr[1] === null) && (raw_result_or_err_arr[2] === null) ){
			// wait! Let's check to see if it is legacy
			return true;
		}

		//FYI, when creating a new draft the spin id is new, so this can never happen
		if(raw_result_or_err_arr[0] === spin_id_str){ //draft
			// console.log("isLookupTitleUnique: ooo found but no change to title made", raw_result_or_err_arr[0], spin_id_str);
			//no change
			//this title is found in the draft lookup already, 
			//normally we woudl say can't use
			// but as this matches exactly what they arelay have (ie they are resaving)
			//so carry on, overwrite is ok (as same)
			return false; //special case send false
		}
		// console.log("isLookupTitleUnique: so this spin must exist in dr sch or pl", raw_result_or_err_arr);
		//bing used somehwere}

		return null; //cb("6701ab04-57f4-4040-b1af-8ef4bc7ad1b5", null);

	}
	
	return expose;

})();
module.exports = REDIS_SPINS_HELPER;