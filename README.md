# Readme

- [ ] Have it create 5 sub headings for this blog
- [ ] 
- [ ] Have it create the summary
  - [ ] Do more AI, make it better (less AI)
  - [ ] Feed it into Spinhub checks
  - [ ] Save it
- [ ] Have it create an image for the summary
  - [ ] Feed it into spinhub checks
  - [ ] HAve spinhub resize it
  - [ ] Save it



- [ ] Have it create 5 sub headings

```bash
{"penname_lang_str":"en-us","penname_str":"stack","spin_id_str":"ec3061b0-aeda-49c4-a1b1-f507ccc2b973","title_str":"why playing dungeons and dragons is realy good for your mental health"}
```



ValidateAndSaveSummary (like in creds)

   DRAFT_VALIDATE.ensureUniqueTitle, //This adds the underscores temp to check it is in the lookup
            DRAFT_VALIDATE.ensureDraftTitleIsNotLegacy, //this ensures the new title is ok to use, ie not being referenced in a legacy table either
            

```js
req.body.text_to_validate_str = req.body.text_to_validate_str.trim().toLowerCase();
			
			//reject early if it included an underscore.
			if(req.body.text_to_validate_str.indexOf("_") !== -1){ //new
				return ERROR_DRAFT(res, component_name_str, "5e41204e-5fa2-4832-99c2-0cd769377605", next);
			}
			
			var title_with_underscores_str = req.body.text_to_validate_str.replace(/ +/g, "_"); //temp replace for this function as its for redis which user underscores due to lookup tables
			req.title_with_underscores_str = title_with_underscores_str; //used in a later MW during validation
			var spin_id_str = req.spin_id_str;
			REDIS_SPINS_HELPER.isLookupTitleUnique(penname_str, title_with_underscores_str, spin_id_str, function(error_code_str, resave_is_false_or_true_boo){
				// console.log("debug1 ensureUniqueTitle", penname_str, title_with_underscores_str, spin_id_str, error_code_str, resave_is_false_or_true_boo);

				// console.log("debug ensureUniqueTitle", error_code_str, always_true_boo, req.body.text_to_validate_str, penname_str, title_with_underscores_str);
				if(error_code_str){
					return ERROR_DRAFT(res, component_name_str, error_code_str, next);
				}

				if(resave_is_false_or_true_boo === false){
					req.resave_boo = true;
				}
				//if it was just a resave carry on
				//still here we can use that title it is not being used right no
				//carry on
				next();
			});
```

```js
	async function isLookupTitleUnique(penname_str, title_with_underscores_str, spin_id_str, cb){
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
			return cb(null, true);
		}

		//FYI, when creating a new draft the spin id is new, so this can never happen
		if(raw_result_or_err_arr[0] === spin_id_str){ //draft
			// console.log("isLookupTitleUnique: ooo found but no change to title made", raw_result_or_err_arr[0], spin_id_str);
			//no change
			//this title is found in the draft lookup already, 
			//normally we woudl say can't use
			// but as this matches exactly what they arelay have (ie they are resaving)
			//so carry on, overwrite is ok (as same)
			return cb(null, false); //special case send false
		}
		// console.log("isLookupTitleUnique: so this spin must exist in dr sch or pl", raw_result_or_err_arr);
		//bing used somehwere}

		cb("6701ab04-57f4-4040-b1af-8ef4bc7ad1b5", null);

	}

```

