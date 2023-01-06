var BACKGROUND = (function(){
		
	var AXIOS = require("axios");
	var REK_HELPER = require("./libs/rekognition_helper.js");
	// var FS = require("fs");

	var 
		expose = {
			getKeyphrasesIntoMemory,
			processThisFF
		}, 
		hide = {
			getAllWordsForSocialImage,
			getAllWordsForTitleImage,
			grabTitleImage,
			produceTheSummary,
			produceTheSummaryImagePrompt,
			makeMD,
			maskTheTitlePolitical,
			maskTheTitleSalt,
			maskTheTitleSpice,
			maskTheTitleSexualized,
			parseToHTML,
			produceTheBody,
			produceTheSocialImage,
			saveDraftHTMLToS3,
			saveDraftMarkdownToS3,
			uploadTitleImageToS3,
			validateAndSaveTheSummary,
			validateTheTitle,
			validateTheTitleDoesNotExist,
			validateTheTitleDoesNotExistInLegacy,

		};

	var s3_params = {};
 	
 	s3_params.region = CONFIG.S3.AWS_REGION_STR;
	
	if(CONFIG.ENV_STR === "development"){ 	
		s3_params.profile = "fullstacklife";
	};

	var { 
		GetObjectCommand,
		PutObjectCommand,
		S3Client
	} = require("@aws-sdk/client-s3"),
	API_S3Client = new S3Client(s3_params);


	//GLOABL
	KEYPHRASE_LIST_POLITICAL_STR_ARR = [];
	KEYPHRASE_LIST_SALT_STR_ARR = [];
	KEYPHRASE_LIST_SEXUALIZED_STR_ARR = [];
	KEYPHRASE_LIST_SPICE_STR_ARR = [];


	async function getAllWordsForSocialImage(social_image_buf){
		console.log("getAllWordsForSocialImage start");
		var result_str_arr_1 = await REK_HELPER.getAllMaskedInImageBuffer(social_image_buf);
		var result_str_arr_2 = await REK_HELPER.getAllItemsInImageBuffer(social_image_buf);
		var label_str_arr = [];
		if(result_str_arr_2){
			for(var i_int = 0; i_int < result_str_arr_2.length; i_int += 1){
				// there will be five
				label_str_arr.push(result_str_arr_2[i_int].Name.toLowerCase());
			}
		} 
		var social_image_word_str_arr = result_str_arr_1.concat(label_str_arr);
		social_image_word_str_arr = [...new Set([...social_image_word_str_arr])];
		return social_image_word_str_arr;
	}

	async function getAllWordsForTitleImage(title_image_buf){
		console.log("getAllWordsForTitleImage start");
		var result_str_arr_1 = await REK_HELPER.getAllMaskedInImageBuffer(title_image_buf);
		var result_str_arr_2 = await REK_HELPER.getAllItemsInImageBuffer(title_image_buf);
		var label_str_arr = [];
		if(result_str_arr_2){
			for(var i_int = 0; i_int < result_str_arr_2.length; i_int += 1){
				// there will be five
				label_str_arr.push(result_str_arr_2[i_int].Name.toLowerCase());
			}
		} 
		//conact and do labels too
		var title_image_word_str_arr = result_str_arr_1.concat(label_str_arr);
		title_image_word_str_arr = [...new Set([...title_image_word_str_arr])];
		return title_image_word_str_arr;
	}

	async function grabSocialImage(url_str){
		var the_image = await AXIOS.get(url_str, {
			responseType: "arraybuffer"
		});
		var base_64_image_str = Buffer.from(the_image.data).toString("base64");
		
		return base_64_image_str;
	}

	async function grabTitleImage(url_str){
		var the_image = await AXIOS.get(url_str, {
			responseType: "arraybuffer"
		});
		var base_64_image_str = Buffer.from(the_image.data).toString("base64");
		
		return base_64_image_str;
	}


	async function getKeyphrasesIntoMemory(){

		const streamToString = (stream) =>
    		new Promise((resolve, reject) => {
      			const chunks = [];
      			stream.on("data", (chunk) => chunks.push(chunk));
      			stream.on("error", reject);
         		stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
   		});


		var 
			all_mask_names_str_arr = [
				"political",
				"salt",
				"sexualized",
				"spice"
			],
			ready_obj_arr = [],
			params = {
				Bucket: CONFIG.S3.VALIDATION_BUCKET_NAME_STR
			},
			response_prom_arr = [];
		for(var i_int = 0; i_int < all_mask_names_str_arr.length; i_int += 1){
			params.Key = all_mask_names_str_arr[i_int] + ".txt";
			var cmd_str = new GetObjectCommand(params);
			response_prom_arr.push(API_S3Client.send(cmd_str));
		}
		ready_obj_arr = await Promise.all(response_prom_arr);

		KEYPHRASE_LIST_POLITICAL_STR_ARR = (await streamToString(ready_obj_arr[0].Body)).split("\n");
		KEYPHRASE_LIST_SALT_STR_ARR = (await streamToString(ready_obj_arr[1].Body)).split("\n");

		KEYPHRASE_LIST_SEXUALIZED_STR_ARR = (await streamToString(ready_obj_arr[2].Body)).split("\n");

		KEYPHRASE_LIST_SPICE_STR_ARR = (await streamToString(ready_obj_arr[3].Body)).split("\n");


		console.log("!Validation Files ready");
	}




	//MOVE TO BACKGROUND
	async function produceTheSummary(str){
		console.log("Producing a summary for " + str);
		var full_prompt_str = `

			Write a seo optimized summary for an article called "${str}" with a maximum word count of 100 words. 

		`;
		var 
			params = {
				model: "text-davinci-003",
				prompt: full_prompt_str.trim(),
				temperature: 0.3,
				max_tokens: 100, //overpricing
				n: 1,
				stream: false
			},
			response = "";
		response = await OPEN_AI.createCompletion(params);
		// console.log("do test checking this works", response);
		return response.data.choices[0].text.replaceAll("\n", "").trim();
	}

	async function produceTheSummaryImagePrompt(summary_str){
		console.log("Producing a very short summary PROMPT for " + summary_str);
		var full_prompt_str = `
			Imagine a scene based on this blog summary with a maximum word count of 100: 
${summary_str}
		`;
		var 
			params = {
				model: "text-davinci-003",
				prompt: full_prompt_str.trim(),
				temperature: 0.4,
				max_tokens: 100, //overpricing
				n: 1,
				stream: false
			},
			response = "";
		response = await OPEN_AI.createCompletion(params);
		// console.log("do test checking this works", response);
		return response.data.choices[0].text.replaceAll("\n", "").trim();
	}


	async function makeMD(html_str){
		var md_str = `
			##FAKER

			Faker 1

			Faker 2

			Faker 3
		`;
		return md_str.trim();
	}

	async function processThisFF(o){
		try{
			//NEED TO stop the TRHOW breaking the whole thing

			console.log("First validate, mask and save this title or reject");
			await validateTheTitle(o);
			await validateTheTitleDoesNotExist(o);
			await validateTheTitleDoesNotExistInLegacy(o);
			


			var title_political_mask_str_arr = await maskTheTitlePolitical(o);
			var title_salt_mask_str_arr = await maskTheTitleSalt(o);
			var title_spin_mask_str_arr = await maskTheTitleSpice(o);
			var title_sexualized_mask_str_arr = await maskTheTitleSexualized(o);
			var title_mask_str_arr = title_political_mask_str_arr.concat(title_salt_mask_str_arr, title_spin_mask_str_arr, title_sexualized_mask_str_arr);

			title_mask_str_arr = [...new Set([...title_mask_str_arr])];



			await saveTheTitleToDynamo(o, title_mask_str_arr);
			console.log("Validated the title", o.title_str, " and saved it. It has this mask str arr:", title_mask_str_arr, " now lets move onto the summary");

			
	
			/*
				1. create the summary
				2. validate it for maskTheSummarySalt
				3. //presume ok
				4. get an image for it

			*/


			var summary_str = await produceTheSummary(o.title_str);	

			var summary_political_mask_str_arr = await maskTheSummaryPolitical(summary_str);
			var summary_salt_mask_str_arr = await maskTheSummarySalt(summary_str);
			var summary_spin_mask_str_arr = await maskTheSummarySpice(summary_str);
			var summary_sexualized_mask_str_arr = await maskTheSummarySexualized(summary_str);
			var summary_mask_str_arr = summary_political_mask_str_arr.concat(summary_salt_mask_str_arr, summary_spin_mask_str_arr, summary_sexualized_mask_str_arr);

			summary_mask_str_arr = [...new Set([...summary_mask_str_arr])];
			// console.log("Stop here now we have a summary", summary_str);
			// await validateAndSaveTheSummary(summary_str);
			console.log("Validated the summary and checked for masks");
			await saveTheSummaryToDynamo(o, summary_str, summary_mask_str_arr);
			console.log("Saved the summary and masks");

	

			/*
		
				Ok now we need to do the social image

			*/

			var dali_prompt_str = await produceTheSummaryImagePrompt(summary_str);
			console.log("DALI prompt", dali_prompt_str);
			// var dali_prompt_str =  "Drywalling Trump Tower with care and attention to detail, avoiding low-grade materials, insufficient insulation, and a rushed approach";
			// "Imagine a scene at Trump Tower where the drywall is being installed with care and attention to detail. The workers are choosing only the highest quality materials, ensuring that the insulation is adequate, and taking their time to ensure a smooth and flawless finish. These mindful choices will result in a strong and energy-efficient structure, worthy of its iconic location.";

			var title_image_url_str = await produceTheTitleImage(o, dali_prompt_str);	
			var social_image_url_str = await produceTheSocialImage(o, dali_prompt_str);	

			console.log("title_image_url_str", title_image_url_str);
			console.log("social_image_url_str", social_image_url_str);
			
			var title_base_64_image_str = await grabTitleImage(title_image_url_str);
			var social_base_64_image_str = await grabSocialImage(social_image_url_str);

	
			console.log("Doing title image masking, now we have all the keywords for this image");
			var title_image_word_str_arr = await getAllWordsForTitleImage(title_base_64_image_str);
			
			var title_image_political_mask_str_arr = await maskTheTitleImagePolitical(title_image_word_str_arr);
			var title_image_salt_mask_str_arr = await maskTheTitleImageSalt(title_image_word_str_arr);
			var title_image_spin_mask_str_arr = await maskTheTitleImageSpice(title_image_word_str_arr);
			var title_image_sexualized_mask_str_arr = await maskTheTitleImageSexualized(title_image_word_str_arr);
			var title_image_mask_str_arr = title_image_political_mask_str_arr.concat(title_image_salt_mask_str_arr, title_image_spin_mask_str_arr, title_image_sexualized_mask_str_arr);

			console.log("We take this array of words for the title image and overwrite or wipe out (if exists) an entry in DDB", title_image_mask_str_arr);
			await saveTheTitleImageMasksToDynamo(o, title_image_mask_str_arr);


			console.log("NEXT now do the same for Social IMAGE");
			var social_image_word_str_arr = await getAllWordsForSocialImage(social_base_64_image_str);
		

			var social_image_political_mask_str_arr = await maskTheSocialImagePolitical(social_image_word_str_arr);
			var social_image_salt_mask_str_arr = await maskTheSocialImageSalt(social_image_word_str_arr);
			var social_image_spin_mask_str_arr = await maskTheSocialImageSpice(social_image_word_str_arr);
			var social_image_sexualized_mask_str_arr = await maskTheSocialImageSexualized(social_image_word_str_arr);
			var social_image_mask_str_arr = social_image_political_mask_str_arr.concat(social_image_salt_mask_str_arr, social_image_spin_mask_str_arr, social_image_sexualized_mask_str_arr);
	

			console.log("We take this array of words for the social image and overwrite or wipe out (if exists) an entry in DDB", social_image_mask_str_arr);
			await saveTheSocialImageMasksToDynamo(o, social_image_mask_str_arr);


			console.log("We got all the masks and updated DDB, we now save (overwrite) both social and title images to the bucket");

			var result_1 = await uploadTitleImageToS3(o, title_base_64_image_str);
			var result_2 = await uploadSocialImageToS3(o, social_base_64_image_str);

			console.log("FAKER B) add the social share resizes x 3 using cnavas and uplaod ASYNC ISSUE");


			console.log("Create the article body");
			var phase_1_main_text_str = await produceTheBody(summary_str);
		
			var main_text_str = await formatTheBody(phase_1_main_text_str);




			console.log("main_text_str", main_text_str);

			// var final_html_str = await parseToHTML(main_text_str);
			//parallel?? here
			// await saveDraftHTMLToS3(o, main_text_str);
			// var final_md_str = await makeMD(final_html_str);
			await saveDraftMarkdownToS3(o, main_text_str);

			console.log("FAKER NOT DONE HTML VERSION: SUPER STOP DONE now remove it from the queue", o);
			
			console.log("now remove the spinbot_stage from DDB!");


			return true; //sowe can close the ticket it if reacheis this
		}catch(e){
			//do individual errors
			console.log("Something broke:", e);
			return false;
		}

	}

	async function parseToHTML(str){
		var html_str_arr = str.replaceAll("/n", "").split("\n");

		var final_str_arr  = html_str_arr.filter(function(item, index_int){
			if(item === ""){
				return false;
			}else{
				return true;
			}
		});
		var html_str = '';
		html_str += '<p>' + final_str_arr.join('</p><p>') + '</p>';

		return html_str;
	
	}


	async function produceTheBody(summary_str){

	
		var full_prompt_str = `
			Use this following blog summary to write the rest of the article in markdown, broken down into between 3 to 7 headers, with paragraphs of at least 100 words each, and add a long conclusion: ${summary_str}
		`;

		var 
			params = {
				model: "text-davinci-003",
				prompt: full_prompt_str.trim(),
				temperature: 0.4,
				max_tokens: 1000, //overpricing???
				n: 1,
				stream: false
			},
			response = "";
		response = await OPEN_AI.createCompletion(params);
		// console.log("do test checking this works", response);
		return response.data.choices[0].text.replaceAll("\n", "").trim();
		
	}


	//move
	

	async function formatTheBody(phase_1_main_text_str){
		console.log("formatTheBody");
	
		var full_prompt_str = `
			format this markdown correctly, flush out the text for each paragraph, and use H2s for all headers: ${phase_1_main_text_str}
		`;

		var 
			params = {
				model: "text-davinci-003",
				prompt: full_prompt_str.trim(),
				temperature: 0.4,
				max_tokens: 1000, //overpricing???
				n: 1,
				stream: false
			},
			response = "";
		response = await OPEN_AI.createCompletion(params);
		// console.log("do test checking this works", response);
		return response.data.choices[0].text;//;.replaceAll("\n", "").trim();
		
	}



	async function produceTheSocialImage(o, dali_prompt_str){

	
		// DEEP_AI.setApiKey('53d0141c-3ca5-4ff8-8279-ec5bd30089a0');

		var data = await DEEP_AI.callStandardApi("text2img", {
			text: dali_prompt_str,
			grid_size: "1",
			width: "512",
			height: "512"
		});

		return data.output_url;
		
	}
	async function produceTheTitleImage(o, dali_prompt_str){

	
		// DEEP_AI.setApiKey('53d0141c-3ca5-4ff8-8279-ec5bd30089a0');

		var data = await DEEP_AI.callStandardApi("text2img", {
			text: dali_prompt_str,
			grid_size: "1",
			width: "1400",
			height: "300"
		});

		return data.output_url;
		
	}

	async function saveDraftHTMLToS3(o, html_str){
		/*
<h2>Lorem Ipsum</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum .</p><output data-role="helper_for_tips" data-paypal_business_id="44444" data-paypal_currency="USD" data-payment_provider="paypal"></output>
		*/
		var params = {
			Bucket: CONFIG.S3.DRAFT_SPIN_CONTENT_STR,
			Key: o.spin_id_str + "/" + "html.txt",
			Body: html_str,
			CacheControl: "max-age=20" //for now
		};
		var cmd_str = new PutObjectCommand(params);
		var response = await API_S3Client.send(cmd_str);
		// console.log("Look in s3", response);
		// return;//donw
	}

	async function saveDraftMarkdownToS3(o, md_str){

		var params = {
			Bucket: CONFIG.S3.DRAFT_SPIN_CONTENT_STR,
			Key: o.spin_id_str + "/" + "markdown.txt",
			Body: md_str,
			CacheControl: "max-age=20" //for now
		};
		var cmd_str = new PutObjectCommand(params);
		var response = await API_S3Client.send(cmd_str);
		// console.log("Look in s3", response);
		return;//donw
	}

	function _atob(a){
	    return Buffer.from(a, 'base64').toString('binary')
	};


	async function uploadSocialImageToS3(o, base_64_image_str){
		console.log("uploadSocialImageToS3?");
		var
			helper_type_str = "png",
			use_this_bin = _atob(base_64_image_str), //.split("data:image/" + helper_type_str + ";base64,")[1]),
			length_int = use_this_bin.length,
        	image_bytes = new ArrayBuffer(length_int),
        	ua = new Uint8Array(image_bytes);

        for (var i_int = 0; i_int < length_int; i_int += 1){
        	ua[i_int] = use_this_bin.charCodeAt(i_int);
        }

        var target_dimensions_str = "512_512";
		var target_bucket_name_str = CONFIG.S3.DRAFT_SPIN_IMAGES_CONTENT_STR; 
		var key_str = o.spin_id_str + "/" + "social_image" + "_" + target_dimensions_str + "." + helper_type_str;
		
		var params = {
			Body: Buffer.from(ua),
			Bucket:	target_bucket_name_str,
			ContentType: "image/" + helper_type_str,
			CacheControl: "max-age=2",
			Key: key_str,
		};

		var cmd_str = new PutObjectCommand(params);
		var response = await API_S3Client.send(cmd_str);
		console.log("uploadSocialImageToS3 DONE", o.spin_id_str);
		return;
	}

	async function uploadTitleImageToS3(o, base_64_image_str){
		console.log("uploadTitleImageToS3?");
		var
			helper_type_str = "png",
			use_this_bin = _atob(base_64_image_str), //.split("data:image/" + helper_type_str + ";base64,")[1]),
			length_int = use_this_bin.length,
        	image_bytes = new ArrayBuffer(length_int),
        	ua = new Uint8Array(image_bytes);

        for (var i_int = 0; i_int < length_int; i_int += 1){
        	ua[i_int] = use_this_bin.charCodeAt(i_int);
        }

        var target_dimensions_str = "1400_300";
		var target_bucket_name_str = CONFIG.S3.DRAFT_SPIN_IMAGES_CONTENT_STR; 
		var key_str = o.spin_id_str + "/" + "title_image" + "_" + target_dimensions_str + "." + helper_type_str;
		
		var params = {
			Body: Buffer.from(ua),
			Bucket:	target_bucket_name_str,
			ContentType: "image/" + helper_type_str,
			CacheControl: "max-age=2",
			Key: key_str,
		};

		var cmd_str = new PutObjectCommand(params);
		var response = await API_S3Client.send(cmd_str);
		console.log("uploadTitleImageToS3 DONE", o.spin_id_str);
		return;
	}

	async function maskTheSummaryPolitical(summary_str){
		var summary_political_mask_str_arr = [];
		var bad_str = "";
		var summary_str_arr = summary_str.trim().split(" ");
		for(var i_int = 0; i_int < summary_str_arr.length; i_int += 1){
			if(summary_str_arr[i_int]){
				if(summary_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_POLITICAL_STR_ARR.indexOf(summary_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = summary_str_arr[i_int];
					console.log("politics: Found a bad word allow it but mask it", bad_str);
					summary_political_mask_str_arr.push("political");
					break;
				}else{
					console.log("Clean word ", bad_str, KEYPHRASE_LIST_POLITICAL_STR_ARR.join(","));
				}
			}
		}
		return summary_political_mask_str_arr;
	}

	async function maskTheSummarySalt(summary_str){
		var summary_salt_mask_str_arr = [];
		var bad_str = "";
		var summary_str_arr = summary_str.trim().split(" ");
		for(var i_int = 0; i_int < summary_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(summary_str_arr[i_int]){
				if(summary_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SALT_STR_ARR.indexOf(summary_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = summary_str_arr[i_int];
					console.log("salt: Found a bad word allow it but mask it", bad_str);
					summary_salt_mask_str_arr.push("salt");
					break;
				}
			}
		}
		return summary_salt_mask_str_arr;
	}

	async function maskTheSummarySpice(summary_str){
		var summary_spice_mask_str_arr = [];
		var bad_str = "";
		var summary_str_arr = summary_str.trim().split(" ");
		for(var i_int = 0; i_int < summary_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", summary_str_arr[i_int]);
			if(summary_str_arr[i_int]){
				if(summary_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SPICE_STR_ARR.indexOf(summary_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = summary_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					summary_spice_mask_str_arr.push("spice");
					break;
				}
			}
		}
		return summary_spice_mask_str_arr;
	}

	async function maskTheSummarySexualized(summary_str){
		var summary_sexualized_mask_str_arr = [];
		var summary_str_arr = summary_str.trim().split(" ");
		for(var i_int = 0; i_int < summary_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", summary_str_arr[i_int]);
			if(summary_str_arr[i_int]){
				if(summary_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SEXUALIZED_STR_ARR.indexOf(summary_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = summary_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					summary_sexualized_mask_str_arr.push("sexualized");
					break;
				}
			}
		}
		return summary_sexualized_mask_str_arr;
	}



	async function maskTheTitlePolitical(o){
		var title_political_mask_str_arr = [];
		var bad_str = "";
		var text_str_arr = o.title_str.trim().split(" ");
		for(var i_int = 0; i_int < text_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(text_str_arr[i_int]){
				if(text_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_POLITICAL_STR_ARR.indexOf(text_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = text_str_arr[i_int];
					console.log("politics: Found a bad word allow it but mask it", bad_str);
					title_political_mask_str_arr.push("political");
					break;
				}else{
					console.log("Clean word ", bad_str, KEYPHRASE_LIST_POLITICAL_STR_ARR.join(","));

				}
			}
		}
		return title_political_mask_str_arr;
	}

	async function maskTheTitleSalt(o){
		var title_salt_mask_str_arr = [];
		var bad_str = "";
		var text_str_arr = o.title_str.trim().split(" ");
		for(var i_int = 0; i_int < text_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(text_str_arr[i_int]){
				if(text_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SALT_STR_ARR.indexOf(text_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = text_str_arr[i_int];
					console.log("salt: Found a bad word allow it but mask it", bad_str);
					title_salt_mask_str_arr.push("salt");
					break;
				}
			}
		}
		return title_salt_mask_str_arr;
	}

	async function maskTheTitleSpice(o){
		var title_spice_mask_str_arr = [];
		var bad_str = "";
		var text_str_arr = o.title_str.trim().split(" ");
		for(var i_int = 0; i_int < text_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(text_str_arr[i_int]){
				if(text_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SPICE_STR_ARR.indexOf(text_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = text_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					title_spice_mask_str_arr.push("spice");
					break;
				}
			}
		}
		return title_spice_mask_str_arr;
	}

	async function maskTheTitleSexualized(o){
		var title_sexualized_mask_str_arr = [];
		var text_str_arr = o.title_str.trim().split(" ");
		for(var i_int = 0; i_int < text_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(text_str_arr[i_int]){
				if(text_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SEXUALIZED_STR_ARR.indexOf(text_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = text_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					title_sexualized_mask_str_arr.push("sexualized");
					break;
				}
			}
		}
		return title_sexualized_mask_str_arr;
	}


	async function maskTheSocialImagePolitical(word_str_arr){
		var social_image_political_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_POLITICAL_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("politics: Found a bad word allow it but mask it", bad_str);
					social_image_political_mask_str_arr.push("political");
					break;
				}else{
					console.log("Clean word ", bad_str, KEYPHRASE_LIST_POLITICAL_STR_ARR.join(","));

				}
			}
		}
		return social_image_political_mask_str_arr;
	}

	async function maskTheSocialImageSalt(word_str_arr){
		var social_image_salt_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", word_str_arr[i_int]);
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SALT_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("salt: Found a bad word allow it but mask it", bad_str);
					social_image_salt_mask_str_arr.push("salt");
					break;
				}
			}
		}
		return social_image_salt_mask_str_arr;
	}

	async function maskTheSocialImageSpice(word_str_arr){
		var social_image_spice_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", word_str_arr[i_int]);
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SPICE_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					social_image_spice_mask_str_arr.push("spice");
					break;
				}
			}
		}
		return social_image_spice_mask_str_arr;
	}

	async function maskTheSocialImageSexualized(word_str_arr){
		var social_image_sexualized_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SEXUALIZED_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					social_image_sexualized_mask_str_arr.push("sexualized");
					break;
				}
			}
		}
		return social_image_sexualized_mask_str_arr;
	}

	async function maskTheTitleImagePolitical(word_str_arr){
		var title_image_political_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_POLITICAL_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("politics: Found a bad word allow it but mask it", bad_str);
					title_image_political_mask_str_arr.push("political");
					break;
				}else{
					console.log("Clean word ", bad_str, KEYPHRASE_LIST_POLITICAL_STR_ARR.join(","));

				}
			}
		}
		return title_image_political_mask_str_arr;
	}

	async function maskTheTitleImageSalt(word_str_arr){
		var title_image_salt_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", word_str_arr[i_int]);
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SALT_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("salt: Found a bad word allow it but mask it", bad_str);
					title_image_salt_mask_str_arr.push("salt");
					break;
				}
			}
		}
		return title_image_salt_mask_str_arr;
	}

	async function maskTheTitleImageSpice(word_str_arr){
		var title_image_spice_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", word_str_arr[i_int]);
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SPICE_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					title_image_spice_mask_str_arr.push("spice");
					break;
				}
			}
		}
		return title_image_spice_mask_str_arr;
	}

	async function maskTheTitleImageSexualized(word_str_arr){
		var title_image_sexualized_mask_str_arr = [];
		var bad_str = "";
		for(var i_int = 0; i_int < word_str_arr.length; i_int += 1){
			// console.log("Checking this word for politics as lowercase", text_str_arr[i_int]);
			if(word_str_arr[i_int]){
				if(word_str_arr[i_int].indexOf(" ") !== -1){
					continue;
				}
				if(KEYPHRASE_LIST_SEXUALIZED_STR_ARR.indexOf(word_str_arr[i_int].toLowerCase()) !== -1){
					bad_str = word_str_arr[i_int];
					console.log("spice: Found a bad word allow it but mask it", bad_str);
					title_image_sexualized_mask_str_arr.push("sexualized");
					break;
				}
			}
		}
		return title_image_sexualized_mask_str_arr;
	}

	async function saveTheSummaryToDynamo(o, summary_str, summary_mask_str_arr){
		console.log("saveTheSummaryToDynamo and masks");

		var response_1 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, "summary", summary_str);
		if(response_1 === null){
				throw "issue overwriting summary";
		}	
		
		var helper_str =  "summary_masks";
			
		if(summary_mask_str_arr && summary_mask_str_arr.length > 0){
			console.log("Replace (overwrite) the masks for the summary masks in DDB with ", summary_mask_str_arr);
			
			var response_2 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, helper_str, summary_mask_str_arr.join(","));
			if(response_2 === null){
				throw "issue overwriting summary masks";
			}		

		}else{
			console.log("The summary now does not use masks, remove them");
			var response_3 = await DYNAMO_HELPER.removeComponent(o.spin_id_str, helper_str);
			if(response_3 === null){
				throw "issue removing summary masks";
			}	
		}
	}

	async function saveTheSocialImageMasksToDynamo(o, mask_str_arr){
		console.log("saveTheSocialImageMasksToDynamo");

		// var response_1 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, "title_image_masks", mask_str_arr.join(","));
		// if(response_1 === null){
		// 		throw "issue overwriting title image masks";
		// }	
		
		var helper_str =  "social_image_masks";
			
		if(mask_str_arr && mask_str_arr.length > 0){
			console.log("Replace (overwrite) the masks for the social image masks in DDB with ", mask_str_arr);
			
			var response_2 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, helper_str, mask_str_arr.join(","));
			if(response_2 === null){
				throw "issue overwriting social image maskss";
			}		

		}else{
			console.log("The summary now does not use masks, remove them");
			var response_3 = await DYNAMO_HELPER.removeComponent(o.spin_id_str, helper_str);
			if(response_3 === null){
				throw "issue removing social image masks";
			}	
		}
	}

	async function saveTheTitleImageMasksToDynamo(o, mask_str_arr){
		console.log("saveTheTitleImageMasksToDynamo");

		// var response_1 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, "title_image_masks", mask_str_arr.join(","));
		// if(response_1 === null){
		// 		throw "issue overwriting title image masks";
		// }	
		
		var helper_str =  "title_image_masks";
			
		if(mask_str_arr && mask_str_arr.length > 0){
			console.log("Replace (overwrite) the masks for the summary in DDB with ", mask_str_arr);
			
			var response_2 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, helper_str, mask_str_arr.join(","));
			if(response_2 === null){
				throw "issue overwriting title image maskss";
			}		

		}else{
			console.log("The summary now does not use masks, remove them");
			var response_3 = await DYNAMO_HELPER.removeComponent(o.spin_id_str, helper_str);
			if(response_3 === null){
				throw "issue removing title image masks";
			}	
		}
	}


	async function saveTheTitleToDynamo(o, title_mask_str_arr){

		//no need to save title text as this was saved initially??? is it validated???
		//do it anyway
		//whitespace version right
		var response = await DYNAMO_HELPER.updateComponent(o.spin_id_str, "title", o.title_str);
		var helper_str =  "title_masks";
		if(response === null){
			throw "issue saving the title";
		}


		if(title_mask_str_arr && title_mask_str_arr.length > 0){
			console.log("Replace (overwrite) the masks for the title in DDB with ", title_mask_str_arr);
			var response_2 = await DYNAMO_HELPER.updateComponent(o.spin_id_str, helper_str, title_mask_str_arr.join(","));
			if(response_2 === null){
				throw "issue overwritig masks";
			}	
				
		}else{
			console.log("FAKER The title has no masks, remove it");
			var response_3 = await DYNAMO_HELPER.removeComponent(o.spin_id_str, helper_str);
			if(response_3 === null){
				throw "issue removing masks";
			}
		}
	}

	async function validateAndSaveTheSummary(){
		console.log("validateAndSaveTheSummary FAKER");

	}

	async function validateTheTitle(o){
		var reg_exp = /^[a-z0-9 -]{3,101}$/; //not allowing an underscore here (Diff then creds)
		if(reg_exp.test(o.title_str) !== true){
			throw "invalid title" + o.title_str;
			//return ERROR_DRAFT(res, component_name_str, "b671d1c8-1227-422e-b3e1-e92264ba3a13", next);
		}
		console.log("Title is fine for regex");
	}

	async function validateTheTitleDoesNotExist(o){
		console.log("start validateTheTitleDoesNotExist");

		var title_str = o.title_str.trim().toLowerCase();
			
		//reject early if it included an underscore.
		if(title_str.indexOf("_") !== -1){ //new
			throw "Title contains _";
		}
		
		var title_with_underscores_str = title_str.replace(/ +/g, "_"); //temp replace for this function as its for redis which user underscores due to lookup tables
		var spin_id_str = o.spin_id_str;
		var penname_str = o.penname_str;

		var throw_away_1 = await REDIS_SPINS_HELPER.isLookupTitleUnique(penname_str, title_with_underscores_str, spin_id_str);

		if(throw_away_1 === null){
			throw "title is not unique";
		}
		// , function(error_code_str, resave_is_false_or_true_boo){
		// 	if(error_code_str){
		// 		//6701ab04-57f4-4040-b1af-8ef4bc7ad1b5
		// 		throw "the title is not unique";
		// 	}

		// 	// if(resave_is_false_or_true_boo === false){
		// 	// 	req.resave_boo = true;
		// 	// }
		// 	//if it was just a resave carry on
		// 	//still here we can use that title it is not being used right no
		// 	//carry on
		// 	return;
		// });

	}

	async function validateTheTitleDoesNotExistInLegacy(o){
		console.log("start validateTheTitleDoesNotExistInLegacy");
		//WARNING Do not EVER use this function during initial draft creation 
		//OR it will prevent ALL new draft creations!
		var penname_str = o.penname_str; //will not be found is not a title component.
		var title_with_underscores_str = o.title_str.replace(/ +/g, "_");
		var component_name_str = "title";
		var pen_title_str = penname_str + ":" + title_with_underscores_str;
		try{
			var found_boo = await DYNAMO_HELPER.isPenTitleLegacy(pen_title_str);
			if(found_boo === false){ //if false it is not in the legacy table yet and thus can be used
				console.log("title does not exist in legacy carry on");
			}else if(found_boo === true){ 	//if true this pen_title is in the table and cannot be used.
				throw "validateTheTitleDoesNotExistInLegacy Legacy title in use";
			}else{
				throw "validateTheTitleDoesNotExistInLegacy unknonw";
			}
		}catch(e){
			console.log(e);
			throw "validateTheTitleDoesNotExistInLegacy CATCH";
		}		
	}

	return expose;

})();
module.exports = BACKGROUND;