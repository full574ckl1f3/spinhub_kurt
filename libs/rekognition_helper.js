var REKOGNITION_HELPER = (function(){


	var rek_params = {
		region: CONFIG.REK.REGION_STR
	};

	if(CONFIG.ENV_STR === "development"){
		rek_params.profile = "fullstacklife";
	}

	var
		{
			DetectLabelsCommand,
			DetectModerationLabelsCommand,
			RekognitionClient
		} = require("@aws-sdk/client-rekognition"),                   
		API_REKClient = new RekognitionClient(rek_params);



	var
		expose = {
			getAllItemsInImageBuffer,
			getAllMaskedInImageBuffer
		},hide = {
			atob
		};

	async function getAllItemsInImageBuffer(image_buf){
		var use_this_bin = atob(image_buf);//.split("data:image/" + "png" + ";base64,")[1]);
		var length = use_this_bin.length;
	    var imageBytes = new ArrayBuffer(length);
	    var ua = new Uint8Array(imageBytes);
	    for (var i = 0; i < length; i++) {
	      ua[i] = use_this_bin.charCodeAt(i);
	    }
	    var items_obj_arr = [];
		var params = {
				Image: { /* required */
					Bytes: Buffer.from(ua)
					// }
				},
				MaxLabels: 5,
				MinConfidence: 90.0 //want to be pretty sure
			};
		var cmd_str = new DetectLabelsCommand(params);
		var data = await API_REKClient.send(cmd_str);
		if(data.Labels && data.Labels.length > 0){
			// console.log("ohh we found a label", data.Labels);
			items_obj_arr = data.Labels;
		}else{
			// console.log("no labels found");
			items_obj_arr = [];// stop using null; 
		}
		return items_obj_arr;
	}

	async function getAllMaskedInImageBuffer(image_buf){
		// console.log("getAllMaskedInImageBuffer", image_buf);
		var use_this_bin = atob(image_buf);//.split("data:image/" + "png" + ";base64,")[1]);
		var moderated_item_str_arr = [];
		var length = use_this_bin.length;
        var imageBytes = new ArrayBuffer(length);
        var ua = new Uint8Array(imageBytes);
        for (var i = 0; i < length; i++) {
          ua[i] = use_this_bin.charCodeAt(i);
        }
		var params = {
			// Image: image_buf, //Buffer.from(ua),
			Image: { /* required */
				Bytes: Buffer.from(ua)
			},
			MinConfidence: 40.0
		};
		var cmd_str = new DetectModerationLabelsCommand(params);
		var data = await API_REKClient.send(cmd_str);
	
	
		if(data && data.ModerationLabels && data.ModerationLabels.length > 0){
			console.log("REK.detectModerationLabel ohh we found moderation stuff", data.ModerationLabels);
			for(var i_int = 0; i_int < data.ModerationLabels.length; i_int += 1){
				var name_to_add_str = data.ModerationLabels[i_int].Name;
				moderated_item_str_arr.push(name_to_add_str.toLowerCase());
				if(data.ModerationLabels[i_int].ParentName){ //
					moderated_item_str_arr.push(name_to_add_str.toLowerCase());
				}
			}
			//ensuring no duplicate phrases
			moderated_item_str_arr = moderated_item_str_arr.filter(function (value, index, array) { 
			    return array.indexOf(value) === index;
			});
			return moderated_item_str_arr;
		}else{
			// console.log("no moderation labels found, must be safesapce");
			return moderated_item_str_arr = [];//null; //stop doing this start using 
		}
	}


	function atob(a) {
	    // return new Buffer(a, "base64").toString("binary");
	    return Buffer.from(a, 'base64').toString('binary')
	};

	return expose;

})();

module.exports = REKOGNITION_HELPER;