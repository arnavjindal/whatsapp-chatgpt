const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');

const { Configuration, OpenAIApi } = require('openai');
const OPENAI_KEY = process.env.OPENAI_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const PHONE_NUMBER = process.env.PHONE_NUMBER;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const systemPrompt = "You are Whatsapp bot and working for a automobile workshop as their marketing officer. draft reply according to that"

const configuration = new Configuration({
	apiKey: OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);


const request = require("request"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json());
function getMsg(body) {

	try {
		let phone_number_id =
			body.entry[0].changes[0].value.metadata.phone_number_id || "";
		let from = ""
		let msg_body = "";

		if (body.entry[0].changes[0].value && body.entry[0].changes[0].value.messages[0]) {
			from = body.entry[0].changes[0].value.messages[0].from || ""; // extract the phone number from the webhook payload
			msg_body = body.entry[0].changes[0].value?.messages[0]?.text?.body || "";
		}

		return { phone_number_id, from, msg_body }
	} catch (error) {
		return error
	}
}

async function getCompletion(prompt) {
	let model = "text-davinci-003"
	try {
		const prediction = await openai.createCompletion({
			model: model,
			prompt: prompt,
			max_tokens: 512,
			temperature: 0.5,
		});

		return prediction.data.choices[0].text
	} catch (error) {
		console.log("Failed to get completion - ", error.message)
		return error
	}
}

async function getChatCompletion(prompt) {
	// let model = "text-davinci-003"
	try {
		const prediction = await openai.createChatCompletion({
			// model: "gpt-3.5-turbo",
			model: "gpt-4",
			messages: [{
				role: "user",
				content: prompt
			}],
			max_tokens: 300
		});

		return prediction.data.choices[0].message.content
	} catch (error) {
		console.log("Failed to get completion - ", error.message)
		return error
	}
}

async function sendMessage(msg, from, id) {
	return new Promise((resolve, reject) => {
		// Set up the options for the POST request
		const options = {
			hostname: 'graph.facebook.com',
			// port: 443,
			path: `/v15.0/${id}/messages`,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
				'Content-Type': `application/json`
			}
		};

		// Make the POST request
		const req = https.request(options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				// Build up the data string as the response comes in
				data += chunk;
			});

			res.on('end', () => {
				// Resolve the promise with the data when the response is complete
				resolve(data);
			});
		});

		req.on('error', (error) => {
			// Reject the promise if there's an error
			reject(error);
		});

		// Write the data you want to send as the request body
		req.write(JSON.stringify({
			messaging_product: "whatsapp",
			to: from,
			// type: "image",
			text: {
				body: msg
			},
			// "image": {
			//     "link": generatedImg,
			//   }
		}));
		req.end();
	});
}


// app.post('/chat', async (req, res) => {

// 	try {
// 		const body = req.body;

// 		console.log("body", body)

// 		const { messages, secret } = body

// 		if (secret == SECRET_KEY && messages.length) {
// 			try {
// 				const prediction = await openai.createChatCompletion({
// 					model: "gpt-3.5-turbo",
// 					messages: messages,
// 					max_tokens: 256
// 				});

// 				return prediction.data.choices[0].message.content
// 			} catch (error) {
// 				console.log("Failed to get completion - ", error.message)
// 				return error
// 			}
// 		} else {
// 			return {
// 				error: "Secret doesn't match",
// 			}
// 		}
// 	} catch (error) {
// 		console.log(error)
// 		return error
// 	}

// 	// res.send('Yo!')
// 	res.sendStatus(200);
// });

app.post('/chat', async (req, res) => {

	try {
		const body = req.body;

		console.log("req", req)

		const messages = body.messages
		const secret = body.secret
		// console.log("secret", secret, SECRET_KEY)

		if (secret == SECRET_KEY && messages.length) {
			try {
				const prediction = await openai.createChatCompletion({
					model: "gpt-3.5-turbo",
					// model: "gpt-4",
					messages: messages,
					max_tokens: 256
				});

				const response = prediction.data.choices[0].message.content;
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.send(response);
			} catch (error) {
				console.log("Failed to get completion - ", error.message);
				res.status(500).send(error);
			}
		} else {
			res.status(400).send({ error: "Secret doesn't match" });
		}
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.get('/chat', async (req, res) => {

	try {
		const body = req.body;

		// console.log("req", req)

		const prompt = req.query.prompt
		const secret = req.query.secret
		// console.log("secret", secret, SECRET_KEY)

		if (secret == SECRET_KEY && prompt.length) {
			try {
				const messages = [
					{
						"role": "system",
						"content": systemPrompt,
					},
					{
						"role": "user",
						"content": prompt,
					}
				]
				const prediction = await openai.createChatCompletion({
					// model: "gpt-3.5-turbo",
					model: "gpt-4",
					messages: messages,
					max_tokens: 256
				});

				const response = prediction.data.choices[0].message.content;
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.send(response);
			} catch (error) {
				console.log("Failed to get completion - ", error.message);
				res.status(500).send(error);
			}
		} else {
			res.status(400).send({ error: "Secret doesn't match" });
		}
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});

app.get('/message', async (req, res) => {

	try {
		const msg = req.query.msg
		
		await sendMessage(msg, PHONE_NUMBER, PHONE_NUMBER_ID);
		res.sendStatus(200);
		// setTimeout(() => {
		// 	console.log(`Reminder: ${msg}`);
		// 	sendMessage(msg, PHONE_NUMBER, PHONE_NUMBER_ID);
		// 	// Send out a message here
		// }, 10000);
		// res.status(200).send('Reminder set');
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});


// app.get('/', async (req, res) => {
// 	res.send('Yo!')
// 	res.sendStatus(200);
// });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// app.post('/', (req, res) => {
//   let data = '';
//   req.on('data', chunk => {
//     data += chunk.toString();
//   });

//   req.on('end', () => {
//     const text = data.split('=')[1];
//     const filePath = '/tmp/myFile.txt';
//     fs.writeFile(filePath, text, err => {
//       if (err) {
//         console.error(err);
//         res.sendStatus(500);
//       } else {
//         console.log('File written successfully');
//         res.sendStatus(200);
//       }
//     });
//   });
// });

app.post('/save', (req, res) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk.toString();
  });

  req.on('end', () => {
    const formData = querystring.parse(data);
    const textInput = formData['text-input'].replace(/\+/g, ' ');
    const filePath = '/tmp/myFile.txt';
    fs.appendFile(filePath, textInput, err => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
      } else {
        res.redirect('/');
      }
    });
  });
});

app.get('/get', (req, res) => {
  const filePath = '/tmp/myFile.txt';
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      res.send(data);
    }
  });
});


app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/
//   const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === SECRET_KEY) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
	  
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});


// app.get('/webhook', (req, res) => {
// 	let mode = req.query["hub.mode"];
// 	let token = req.query["hub.verify_token"];
// 	let challenge = req.query["hub.challenge"];
// 	res.send(challenge)
// });

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
	// Parse the request body from the POST
	let body = req.body;
  
	// Check the Incoming webhook message
	console.log(JSON.stringify(req.body, null, 2));
  
	// info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
	if (req.body.object) {
	  if (
		req.body.entry &&
		req.body.entry[0].changes &&
		req.body.entry[0].changes[0] &&
		req.body.entry[0].changes[0].value.messages &&
		req.body.entry[0].changes[0].value.messages[0]
	  ) {
		let phone_number_id =
		  req.body.entry[0].changes[0].value.metadata.phone_number_id;
		let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
		let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
		axios({
		  method: "POST", // Required, HTTP method, a string, e.g. POST, GET
		  url:
			"https://graph.facebook.com/v12.0/" +
			PHONE_NUMBER_ID +
			"/messages?access_token=" +
			WHATSAPP_ACCESS_TOKEN,
		  data: {
			messaging_product: "whatsapp",
			to: from,
			text: { body: "Ack: " + msg_body },
		  },
		  headers: { "Content-Type": "application/json" },
		});
	  }
	  res.sendStatus(200);
	} else {
	  // Return a '404 Not Found' if event is not from a WhatsApp API
	  res.sendStatus(404);
	}
  });


//   app.post('/webhook', async (req, res) => {

// 	try {
// 		const body = req.body;

// 		const { phone_number_id, from, msg_body } = getMsg(body)
// 		console.log("phone", phone_number_id, from)
// 		if (from && msg_body) {
// 			let msg = await getChatCompletion(msg_body)
// 			console.log("message:", from, msg_body + ": " + msg)
// 			let result = await sendMessage(msg, from, phone_number_id);
// 		}
// 	} catch (error) {
// 		console.log(error)
// 	}

// 	// res.send('Yo!')
// 	res.sendStatus(200);
// });

app.get('/privacy', (req, res) => {
	let text = `Thank you for visiting our website/app. We take the privacy of our users very seriously and are committed to protecting your personal information. This privacy policy explains how we collect, use, and share your personal information when you use our website/app.

	Collection of Personal Information
	
	We may collect personal information from you when you use our website/app, such as your name, email address, and any other information you choose to provide. We may also collect certain information automatically, such as your IP address, device type, and browser type.
	
	Use of Personal Information
	
	We may use your personal information for the following purposes:
	
	To provide and improve our website/app and services
	To communicate with you about your account or our services
	To personalize your experience on our website/app
	To protect against, identify, and prevent fraud and other illegal activities
	Sharing of Personal Information
	
	We may share your personal information with third parties for the following purposes:
	
	To service providers who assist us in providing our services
	To comply with legal requirements, such as a subpoena or court order
	To protect the rights, property, or safety of us or our users
	Cookies and Tracking Technologies
	
	We may use cookies and other tracking technologies to collect and store information about your use of our website/app. These technologies may be used to personalize your experience, remember your preferences, and track your movements on our website/app. You can disable cookies in your browser settings, but doing so may limit your ability to use certain features of our website/app.
	
	Third-Party Links
	
	Our website/app may contain links to third-party websites. We are not responsible for the privacy practices of these websites, and we encourage you to review the privacy policies of each website you visit.
	
	Data Security
	
	We take appropriate measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no security measures are perfect, and we cannot guarantee the security of your personal information.
	
	Changes to This Privacy Policy
	
	We may update this privacy policy from time to time. We will post any changes on this page and encourage you to review the policy periodically. Your continued use of our website/app after any changes have been made signifies your acceptance of the updated policy.
	
	Contact Us
	
	If you have any questions or concerns about this privacy policy or the collection, use, and sharing of your personal information, please contact us at tinkr.simpson@gmail.com.`

	res.send(text)
});

app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));
