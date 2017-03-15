'use strict';

const express = require('express');
const bodyParser = require('body-parser');
//const Promise = require('express-promise');

const restService = express();
restService.use(bodyParser.json());


restService.listen((process.env.PORT || 5000), function () {
    console.log("Server listening");
});

// --------------- WEB HOOK FOR API AI / FACEBOOK : START ----------------------

restService.post('/hook', function (req, res) {
    try {
        var speech = 'We are not able to serve your request right now. Please try after some time.';

        var facebook_message;

        console.log("--------- For API AI / FACEBOOK --------");

        if (req.body) {
            var requestBody = req.body;

            var apiai_facebook_intent = JSON.stringify(requestBody.result.metadata.intentName);

            if(apiai_facebook_intent == '\"1.0 Introduction\"'){

                httpsFacebookGetUserDetails(requestBody.originalRequest.data.sender.id).then(function(data) {

                    var userName = data.first_name;

                    // Intro  messages array
                    var introduction_message_array = [
                        'Hello there! I am here, not to help you eat less but, to eat right. Just give me name of the food and I will give you its nutritional value. It can be as simple as \"1 cup mashed potatoes and 2 tbsp gravy\".  Let\'s get started.',
                        'Hello there! Don\'t eat less...eat right. And I am here to help you do that. Just give me name of the food and I will give you its nutritional value. It can be as simple as \"1 cup mashed potatoes and 2 tbsp gravy\".  Let\'s get started.'
                    ]

                    // using Math func to generate random number and pick up random message from the array.
                    speech = introduction_message_array[Math.floor(Math.random()*introduction_message_array.length)];

                    speech = speech.replace('there', userName); 

                    return res.json({
                        speech: speech,
                        displayText: speech,
                        source: 'nutritionic'
                    });
                });                
            }

            else if(apiai_facebook_intent == '\"1.1 Why were you created?\"'){
                
                //Why created messages array
                var why_created_message_array = [
                    'There is no diet that will do what eating healthy does. So let\'s work together, skip the diet and eat healthy. Just give me name of the food and I will give you its nutritional value. It can be as simple as \"1 cup mashed potatoes and 2 tbsp gravy\".  Let\'s get started.',
                    'Until you get your nutrition right, nothing is gonna change. And I am here to get your nutrition right. Just give me name of the food and I will give you its nutritional value. It can be as simple as \"1 cup mashed potatoes and 2 tbsp gravy\".  C\'mon shoot!',
                    'Fitness is a science, not magic. I am here to help you understand that. Just give me name of the food and I will give you its nutritional value. It can be as simple as \"1 cup mashed potatoes and 2 tbsp gravy\".  C\'mon shoot!'
                ]

                // using Math func to generate random number and pick up random message from the array.
                speech = why_created_message_array[Math.floor(Math.random()*why_created_message_array.length)];   

                return res.json({
                    speech: speech,
                    displayText: speech,
                    source: 'nutritionic'
                });
            }

            else if(apiai_facebook_intent == '\"1.3 Search\"'){

                httpPostAsyncGetFoodDetails(requestBody.result.parameters.any).then(function(data) {
                    
                    // Get the required information from the big json. 
                    var food_data = data;
                    var elements_array = [];
                    var food_bio="";

                    console.log(food_data.foods.length);

                    for(var i = 0; i < food_data.foods.length; i++) 
                    {
                        var food_item = food_data.foods[i];
                        
                        //var number = i++;
                        // Preparing string with all the required data
                        food_bio = food_bio+"\n"+
                            i+"."+food_item.food_name+":"+
                            "\n Serving unit: "+food_item.serving_unit+
                            "\n Serving qty: "+food_item.serving_qty+
                            "\n Serving weight : "+food_item.serving_weight_grams+"g"+
                            "\n Calories : "+food_item.nf_calories+
                            "\n";

                        var view_details_url = "https://www.nutritionix.com/food/"+(/\s/.test(food_item.food_name)?food_item.food_name.replace(" ","-"):food_item.food_name);
                        // For Facebook : Preparing 'elements' array dynamically with all the required data
                        elements_array.push({ 
                            "title":food_item.food_name,
                            "image_url":food_item.photo.thumb,
                            "subtitle":food_item.nf_calories+" cal for "+food_item.serving_qty+" "+food_item.serving_unit,
                            "buttons":[
                                {
                                    "type":"web_url",
                                    "url":view_details_url,
                                    "title":"View Details"
                                }            
                            ] 
                        });
                    }

                    // Return speech data.
                    speech = food_bio;

                    // Create facebook message object.
                    facebook_message = 
                    {
                        "attachment":{
                            "type":"template",
                            "payload":{
                              "template_type":"generic",
                              "elements": elements_array
                            }
                        }
                    };

                    console.log(speech);

                    return res.json({
                        speech: speech,
                        displayText: speech,
                        source: 'nutritionic', 
                        data: {'facebook' : facebook_message}
                    });

                });
            }
            
        }
        
    } catch (err) {
        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
    }
});

// --------------- WEB HOOK FOR API AI / FACEBOOK : END ----------------------


// --------------- WEB HOOK FOR AMAZON ALEXA : START ----------------------

restService.post('/alexa-hook', function (req, res) {
    try {
        var speech = 'We are not able to serve your request right now. Please try after some time.';
        
        console.log("--------- For Alexa --------");
        
        if (req.body) {

            var requestBody = req.body;

            var alexa_intent = JSON.stringify(requestBody.request.intent.name);

            console.log("Request Intent : "+ alexa_intent);            

            if(alexa_intent == '\"Search\"'){

                var alexa_food_requested = JSON.stringify(requestBody.request.intent.slots.food_info.value);            

                console.log("Request Food Info : "+ alexa_food_requested);

                httpPostAsyncGetFoodDetails(alexa_food_requested).then(function(data) {
                
                    // Get the required information from the big json. 
                    var food_data = data;

                    console.log("Request Food Data : "+ JSON.stringify(food_data));

                    var elements_array = [];
                    var food_bio="";

                    if(food_data.message === "Something went wrong"){

                        // Error messages array
                        var error_message_array = [
                            'Damn! The rabbits have been nibbling the server cables again! Gotta rush...I\'ll be right back!',
                            'I am now serving the angels...\'ll be back to serve the humans shortly',
                            'Sshh...My developers now sleeping and dreaming about new features to implement. I\'ll be back shortly',
                            'You may be addicted to me but I care about your health and want to give you a break for sometime. Will be back soon.',
                            'You are in the right place and I am not. I am trying to get there soon. Bear with me please'
                        ]

                        // using Math func to generate random number and pick up random message from the array.
                        speech = error_message_array[Math.floor(Math.random()*error_message_array.length)];

                    }
                    else if(typeof food_data == "undefined" || typeof food_data.foods == "undefined"){

                        speech = "I am not sure if I heard that correctly. Please try again with a clear food name."

                    }else{

                        for(var i = 0; i < food_data.foods.length; i++) 
                        {
                            var food_item = food_data.foods[i];
                            // Preparing string with all the required data
                            food_bio = food_bio+" "+food_item.serving_qty+" "+food_item.serving_unit+" of "+food_item.food_name+" contains "+food_item.nf_calories+" calories ";
                        }

                        // Return speech data.
                        speech = food_bio;
                    }
                    

                    console.log(speech);

                    return res.json({
                        version: "1.0",
                        response: {
                            outputSpeech: {
                              type: "PlainText",
                              text: speech
                            },
                        }
                    });

                });

            }else if(alexa_intent == '\"Introduction\"'){
                speech = "Hello there! I am Nutribot. Lose weight with me, the fastest and easiest-to-use CALORIE COUNTER. With the largest food database by far (over 5,000,000 foods) and amazingly fast and easy food and exercise entry, I'll help you take those extra pounds off! And it's FREE! There is no better diet app - period. Start by simply saying Give me calories for an apple"

                return res.json({
                    version: "1.0",
                    response: {
                        outputSpeech: {
                          type: "PlainText",
                          text: speech
                        },
                    }
                });
            }  
        }
        
    } catch (err) {
        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
    }
});

// --------------- WEB HOOK FOR AMAZON ALEXA : END ----------------------


// --------------- MAKE ASYNC REQ USING USER'S SEARCH ITEM AND SEND BACK RESPONSE FROM NUTRITIONIX : START ----------------------

function httpPostAsyncGetFoodDetails(search_query)
{
    return new Promise(function(resolve,reject) {
        
        var https = require('https');

        var post_data = '{"query": "'+search_query+'"}';

        var options = {
            host: 'trackapi.nutritionix.com',
            path: '/v2/natural/nutrients',
            method: 'POST',
            headers: {
                'x-app-id': '441b057a',
                'x-app-key': 'd5da0a5801656981122596917c1a58d5',
                'x-remote-user-id': '0',
                'accept':'application/json',
                'content-type':'application/json',
            }
        };

        var req = https.request(options, function(res) {
            var res_data;
            //Buffer the body entirely for processing as a whole.
            var bodyChunks = [];
            
            res.on('data', function(chunk) {
                bodyChunks.push(chunk);
            }).on('end', function() {
                var body = Buffer.concat(bodyChunks);
                var food_data = JSON.parse(body);
                resolve(food_data);
            })
        });

        req.on('error', function(e) {
            reject(e.message);
        });

        req.write(post_data);
        req.end();

        console.log(req);

    });
}

// --------------- MAKE ASYNC REQ USING USER'S SEARCH ITEM AND SEND BACK RESPONSE FROM NUTRITIONIX : END ----------------------


// --------------- FACEBOOK ONLY - GET USER DETAILS FROM FACEBOOK 'USER PROFILE API' : START ----------------------

function httpsFacebookGetUserDetails(sender_id)
{
    return new Promise(function(resolve,reject) {

        //NUTRIBOT FACEBOOK PAGE ACCESS TOKEN: EAAZAqEYoIqb4BAAwIIvKYupllTjvURmKLzcZAiZC29tRLdjvPuO1Fgta3eKeRueid4EQKZB8BDF4Oy8WfvAjoVHpj9W2JQoLlAsRWTbD6t3wa4kXUs4CfoVhMGZAZC1hmUNpabkNWeGwYjvfwCeJquoFCANx5HZA0m2Qh3lrjLPsAZDZD
        
        var https = require('https');

        var options = {
            host: 'graph.facebook.com',
            path: '/v2.6/'+sender_id+'?access_token=EAAZAqEYoIqb4BAAwIIvKYupllTjvURmKLzcZAiZC29tRLdjvPuO1Fgta3eKeRueid4EQKZB8BDF4Oy8WfvAjoVHpj9W2JQoLlAsRWTbD6t3wa4kXUs4CfoVhMGZAZC1hmUNpabkNWeGwYjvfwCeJquoFCANx5HZA0m2Qh3lrjLPsAZDZD',
            method: 'GET',
            headers: {
                'content-type':'application/json',
            }
        };

        var req = https.request(options, function(res) {
            var res_data;
            //Buffer the body entirely for processing as a whole.
            var bodyChunks = [];
            
            res.on('data', function(chunk) {
                bodyChunks.push(chunk);
            }).on('end', function() {
                var body = Buffer.concat(bodyChunks);
                var fb_user_data = JSON.parse(body);
                resolve(fb_user_data);
            })
        });

        req.on('error', function(e) {
            reject(e.message);
        });

        req.end();

    });
}

// --------------- FACEBOOK ONLY - GET USER DETAILS FROM FACEBOOK 'USER PROFILE API' : START ----------------------


// --------------- FUTURE USE - SHOW GET STARTED FACEBOOK BUTTON TO USER : START ----------------------

function showFacebookGetStartedButton(search_query)
{
    return new Promise(function(resolve,reject) {

        //NUTRIBOT FACEBOOK PAGE ACCESS TOKEN: EAAZAqEYoIqb4BAAwIIvKYupllTjvURmKLzcZAiZC29tRLdjvPuO1Fgta3eKeRueid4EQKZB8BDF4Oy8WfvAjoVHpj9W2JQoLlAsRWTbD6t3wa4kXUs4CfoVhMGZAZC1hmUNpabkNWeGwYjvfwCeJquoFCANx5HZA0m2Qh3lrjLPsAZDZD
        
        var https = require('https');

        var post_data = '{"setting_type":"call_to_actions","thread_state":"new_thread","call_to_actions":[{"payload":"USER_DEFINED_PAYLOAD"}]}';

        var options = {
            host: 'graph.facebook.com',
            path: '/v2.6/me/thread_settings?access_token=EAAZAqEYoIqb4BAAwIIvKYupllTjvURmKLzcZAiZC29tRLdjvPuO1Fgta3eKeRueid4EQKZB8BDF4Oy8WfvAjoVHpj9W2JQoLlAsRWTbD6t3wa4kXUs4CfoVhMGZAZC1hmUNpabkNWeGwYjvfwCeJquoFCANx5HZA0m2Qh3lrjLPsAZDZD',
            method: 'POST',
            headers: {
                'content-type':'application/json',
            }
        };

        var req = https.request(options, function(res) {
            var res_data;
            //Buffer the body entirely for processing as a whole.
            var bodyChunks = [];
            
            res.on('data', function(chunk) {
                bodyChunks.push(chunk);
            }).on('end', function() {
                var body = Buffer.concat(bodyChunks);
                var food_data = JSON.parse(body);
                resolve(food_data);
            })
        });

        req.on('error', function(e) {
            reject(e.message);
        });

        req.write(post_data);
        req.end();

    });
}

// --------------- FACEBOOK ONLY - GET USER DETAILS FROM FACEBOOK 'USER PROFILE API' : END ----------------------

