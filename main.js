"use strict";

/*
 * Created with @iobroker/create-adapter v1.33.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
// const fs = require("fs");
// const xpa = require("xplora-api.js");
const xploraConnector = require("./lib/xploraConnector");
const xploraDp = require("./lib/datapoints");

/*
	Runtime variables
*/
let timeoutXploraPoll;
let systemLanguage = "de";
let xploraData = undefined;

/*
	Adapter settings
*/
let XPLORA_COUNTRYCODE = undefined;
let XPLORA_PHONENUMBER = undefined;
let XPLORA_PASSWORD = undefined;
let XPLORA_POLLING_INTERVAL = undefined;
let SENDTO_PLACES_ADAPTER_INSTANCE = undefined;
let SENDTO_PLACES_ADAPTER_REGEXP= undefined;


class Xplora extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "xplora",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		this.getForeignObject("system.config", (err, obj) => {
			//	Support for encrypted credentials?
			if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {

				// eslint-disable-next-line no-inner-declarations
				function decrypt(key, value) {
					let result = "";
					for (let i = 0; i < value.length; ++i) {
						result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
					}
					return result;
				}

				if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
					this.config.xplora_password = decrypt(obj.native.secret, this.config.xplora_password);
				} else {
					//noinspection JSUnresolvedVariable
					this.config.xplora_password = decrypt("Zgfr56gFe87jJOM", this.config.xplora_password);
				}
			}

			//	Start the main procedure.
			this.main();
		});

		// Initialize your adapter here

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		// this.log.info("config option1: " + this.config.option1);
		// this.log.info("config option2: " + this.config.option2);

		// this.main();

		// /*
		// For every state in the system there has to be also an object of type state
		// Here a simple template for a boolean variable named "testVariable"
		// Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		// */
		// await this.setObjectNotExistsAsync("testVariable", {
		// 	type: "state",
		// 	common: {
		// 		name: "testVariable",
		// 		type: "boolean",
		// 		role: "indicator",
		// 		read: true,
		// 		write: true,
		// 	},
		// 	native: {},
		// });

		// // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		// this.subscribeStates("testVariable");
		// // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// // this.subscribeStates("lights.*");
		// // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// // this.subscribeStates("*");

		// /*
		// 	setState examples
		// 	you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		// */
		// // the variable testVariable is set to true as command (ack=false)
		// await this.setStateAsync("testVariable", true);

		// // same thing, but the value is flagged "ack"
		// // ack should be always set to true if the value is received from or acknowledged from the target system
		// await this.setStateAsync("testVariable", { val: true, ack: true });

		// // same thing, but the state is deleted after 30s (getState will return null afterwards)
		// await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// // examples for the checkPassword/checkGroup functions
		// let result = await this.checkPasswordAsync("admin", "iobroker");
		// this.log.info("check user admin pw iobroker: " + result);

		// result = await this.checkGroupAsync("admin", "admin");
		// this.log.info("check group user admin group admin: " + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			//	Clear timeouts
			if (timeoutXploraPoll) {
				this.log.info(`Stop polling the Xplora Cloud service (timeout handler id ${timeoutXploraPoll}).`);
				this.clearTimeout(timeoutXploraPoll);
			}

			//	Reset adapter connection state to "disconnected"
			this.setAdapterConnectionState(false);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

	// async getXploraInformation() {
	// 	//  Create a new Xplora API handler
	// 	const gqlHandler = new xpa.GQLHandler(
	// 		this.config.xplora_countrycode,
	// 		this.config.xplora_phonenumber,
	// 		this.config.xplora_password,
	// 		"en-US", "");

	// 	//  Login with the credentials above
	// 	const issueToken = await gqlHandler.login();

	// 	//  Get my information
	// 	// console.log("---=== My Info ===---");
	// 	// console.dir(await gqlHandler.getMyInfo(), {depth: null, colors: true});
	// 	this.log.debug(JSON.stringify(await gqlHandler.getMyInfo()));

	// 	this.log.debug(JSON.stringify(issueToken.user.children));

	// 	this.log.debug(JSON.stringify(await gqlHandler.getWatches(issueToken.user.children[0].ward.id)));

	// 	//  Get the last location information for the first child in the array
	// 	// console.log("---=== Letzte Ortung ===---");
	// 	// console.dir(await gqlHandler.getWatchLastLocation(issueToken.user.children[0].ward.id), {depth: null, colors: true});
	// 	this.log.debug(JSON.stringify(await gqlHandler.getWatchLastLocation(issueToken.user.children[0].ward.id)));
	// }

	async main() {
		try {
			//	Reset adapter connection state to "disconnected"
			this.setAdapterConnectionState(false);

			//	Get ioBroker system language
			systemLanguage = await this.GetSystemLanguage();

			//	Get adapter settings
			if (await this.GetAdapterSettings()) {
				//	Create datapoints
				await xploraDp.createDatapoints(this);

				//	Login to Xplora Cloud service
				const issueToken = await xploraConnector.loginConnector(
					XPLORA_COUNTRYCODE, XPLORA_PHONENUMBER, XPLORA_PASSWORD,
					systemLanguage, "", this
				);

				this.log.silly(JSON.stringify(issueToken));

				//	Login successfull?
				if (issueToken) {
					//	Start polling the Xplora Cloud service
					await this.SetupXploraPolling(1000);
				}
				else {
					this.log.error("Failed to login.");
					this.disable();
					return;
				}
			}
			else {
				//	Adaptersettings are faulty. Disable the instance.
				this.disable();
				return;
			}

		} catch (error) {
			this.log.error(`Failed to initialize adapter: ${error}`);
		}
	}

	/**
	 * Get ioBroker system language
	 * @returns ISO Code
	 */
	async GetSystemLanguage() {
		let language = "de";
		const ret = await this.getForeignObjectAsync("system.config");

		if (ret) {
			language = ret.common.language;
		}

		this.log.silly(`System language: ${language}`);
		return language;
	}

	async GetAdapterSettings() {
		let configHasErrors = false;

		//	Xplora Country code for mobile phonenumber
		if (this.config.xplora_countrycode) {
			//	Remove any spaces, tabs and linefeeds
			// XPLORA_COUNTRYCODE = this.config.xplora_countrycode.trim();
			XPLORA_COUNTRYCODE = this.config.xplora_countrycode.replace(/\s+/g, "");

			//	Set "+" as prefix if it's missing
			if (!XPLORA_COUNTRYCODE.startsWith("+")) XPLORA_COUNTRYCODE = "+" + XPLORA_COUNTRYCODE;

			//	To-Do: RegExp validation with pattern: /^\+(\d{1}\-)?(\d{1,3})$/

			this.log.debug(`XPLORA_COUNTRYCODE: ${XPLORA_COUNTRYCODE}`);
		}
		else {
			this.log.error("You have to set the Xplora Country code for your login account!");
			configHasErrors = true;
		}

		//	Xplora mobile phonenumber
		if (this.config.xplora_phonenumber) {
			//	Remove any spaces, tabs and linefeeds
			XPLORA_PHONENUMBER = this.config.xplora_phonenumber.replace(/\s+/g, "");

			//	Check if the phonenumber starts with the country code
			if (XPLORA_PHONENUMBER.startsWith(XPLORA_COUNTRYCODE)) {
				this.log.warn("Enter your phonenumber without the country code! Will remove the country code for you.");
				XPLORA_PHONENUMBER = XPLORA_PHONENUMBER.substr(XPLORA_COUNTRYCODE.length);
			}

			//	To-Do: RegExp validation with pattern: /^\d+$/

			this.log.debug(`XPLORA_PHONENUMBER: ${XPLORA_PHONENUMBER}`);
		}
		else {
			this.log.error("You have to set the Xplora mobile phonenumber for your login account!");
			configHasErrors = true;
		}

		//	Xplora password
		if (this.config.xplora_password) {
			//	Remove any spaces, tabs and linefeeds
			XPLORA_PASSWORD = this.config.xplora_password;

			this.log.debug(`XPLORA_PASSWORD: ${XPLORA_PASSWORD.substr(0, 3)}xxxxxxx`);
		}
		else {
			this.log.error("You have to set the Xplora password for your login account!");
			configHasErrors = true;
		}

		//	Xplora polling interval
		if (this.config.xplora_polling_interval) {
			XPLORA_POLLING_INTERVAL = this.config.xplora_polling_interval;

			// @ts-ignore
			if (!isNaN(this.config.xplora_polling_interval) && Number.isInteger(parseFloat(this.config.xplora_polling_interval))) {
				// @ts-ignore
				XPLORA_POLLING_INTERVAL = parseInt(this.config.xplora_polling_interval);

				this.log.debug(`XPLORA_POLLING_INTERVAL: ${XPLORA_POLLING_INTERVAL} sec.`);
			}
			else {
				this.log.error(`The Xplora polling interval must be a number. Check your setting: ${this.config.xplora_polling_interval}`);
				configHasErrors = true;
			}
		}
		else {
			this.log.error("You have to set the Xplora polling interval in seconds!");
			configHasErrors = true;
		}

		return !configHasErrors;
	}

	async SetupXploraPolling(msTimeout) {
		timeoutXploraPoll = this.setTimeout( () => {
			timeoutXploraPoll = undefined;
			this.PollXploraData();
		}, msTimeout);

		this.log.silly(`New Xplora polling handler id ${timeoutXploraPoll} will start in ${msTimeout/1000} sec.`);
	}

	async PollXploraData() {
		if (timeoutXploraPoll) {
			//	Polling is already active
			this.log.warn("Regular polling is already enabled. You should never see this message.");
		}
		else {
			// try {
			// 	//	Poll data from Xplora Cloud service
			// 	// const issueToken = await xploraConnector.login(
			// 	// 	XPLORA_COUNTRYCODE, XPLORA_PHONENUMBER, XPLORA_PASSWORD,
			// 	// 	systemLanguage, "", this
			// 	// );

			// 	// this.log.silly(JSON.stringify(issueToken));
			// 	// this.log.debug(JSON.stringify(await xploraConnector.getMyInfo()));

			// 	//	Get array of children
			// 	const myChildren = xploraConnector.getChildren();

			// 	//	Get watches and locations
			// 	myChildren.forEach(async element => {
			// 		const myWatches = await xploraConnector.getWatches(element.id);
			// 		// this.log.debug(JSON.stringify(myWatches));

			// 		const lastLocation = await xploraConnector.getWatchLastLocation(element.id);
			// 		// this.log.debug(JSON.stringify(lastLocation));

			// 		this.log.info(`${element.name}: lat ${lastLocation.lat}, lng ${lastLocation.lng}, radius ${lastLocation.rad}, time ${(new Date(lastLocation.tm*1000)).toLocaleString()}`);
			// 	});

			// } catch (error) {
			// 	this.log.error(error);
			// }

			// // this.log.debug("Poll ...");

			//	Poll data from Xplora Cloud service
			xploraData = await xploraConnector.fullDataPoll();

			//	Update the adapter connection flag.
			this.setAdapterConnectionState(xploraData ? true : false);

			//	Publish Xplora data to datapoints
			xploraDp.publishXploraData(xploraData);

			//	Finally set timestamp for last update information
			this.setLastUpdate(xploraData.timeStamp);

			//	Setup Polling again ...
			await this.SetupXploraPolling(XPLORA_POLLING_INTERVAL * 1000);
		}
	}

	async setAdapterConnectionState(isConnected) {
		await this.setStateAsync("info.connection", { val: isConnected, ack: true });
	}

	async setLastUpdate(timestamp) {
		await this.setStateAsync("info.lastUpdate", { val: timestamp, ack: true });
	}
}

process.on("SIGINT", function() {
	// stopAll();
	// setConnected(false);
});

process.on("uncaughtException", function(err) {
	console.log("Exception: " + err + "/" + err.toString());
	// adapter && adapter.log && adapter.log.warn('Exception: ' + err);

	// stopAll();
	// setConnected(false);
});

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Xplora(options);
} else {
	// otherwise start the instance directly
	new Xplora();
}
