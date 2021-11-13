"use strict";

const xpa = require("xplora-api.js");

let parentAdapter = undefined;
let gqlHandler = undefined;
let issueToken = undefined;
let COUNTRYCODE = undefined;
let PHONENUMBER = undefined;
let PASSWORD = undefined;
let LANGUAGECODE = "";
let TIMEZONE = "";
const tokenExpiresAfter = 270;
let dtIssueToken = Date.now() - (tokenExpiresAfter * 1000);
let xploraData = {};
let maxRetries = 3;
let retryDelay = 3;

/**
 * Sleep a little bit.
 * @param {number} milliseconds Time to sleep in milliseconds
 * @returns
 */
function Sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Set the parent ioBroker adapter instance.
 * @param {*} adapter The parent ioBroker adapater instance.
 * @returns
 */
function setAdapter(adapter) {
	if (adapter) parentAdapter = adapter;

	return true;
}

/**
 * Log in to the Xplora Cloud services.
 * @param {boolean} forceLogin Set to true to enforce login, even if the adapter has a valid token.
 * @returns The issueToken.
 */
async function login(forceLogin) {
	//	Only try to login if forced to or if not allready connected.
	if (!isConnected() || hasTokenExpired() || forceLogin) {
		if (!parentAdapter) throw new Error("Adapter instance is missing.");

		try {
			//	Reset connection
			logoff();

			//	Create a new GraphQL Handler for querying the Xplora Cloud service
			parentAdapter.log.silly("Creating new GraphQL Handler");
			gqlHandler = new xpa.GQLHandler(
				COUNTRYCODE, PHONENUMBER, PASSWORD,
				LANGUAGECODE, TIMEZONE
			);

			if (gqlHandler) {
				//	Login to Xplora Cloud service (try multiple times)
				let retryCounter = 0;

				while (!isConnected() && (retryCounter < maxRetries + 2)) {
					retryCounter++;

					parentAdapter.log.silly(`Trying to log in (${retryCounter} / ${maxRetries + 1}) ...`);
					//	Try to login
					issueToken = await gqlHandler.login();

					//	Wait for next try
					if (!issueToken) {
						parentAdapter.log.warn(`Login failed (${retryCounter} / ${maxRetries + 1}). Will retry after ${retryDelay} sec. ...`);
						await Sleep(retryDelay * 1000);
					}
				}

				if (issueToken) {
					parentAdapter.log.debug(`Successfully logged in with ${COUNTRYCODE} ${PHONENUMBER}`);
					dtIssueToken = Date.now();
				}
			}
			else {
				throw new Error("Unknown error creating a new GraphQL handler instance.");
			}
		} catch (error) {
			//	Login failed.
			gqlHandler = undefined;
			issueToken = undefined;

			parentAdapter.log.error(`Failed to login to Xplora Cloud service: ${error}`);
		}
	}

	return issueToken;
}

/**
 * Log off from the Xplora Cloud services.
 *
 * This function resets the authentication information.
 */
function logoff() {
	gqlHandler = undefined;
	issueToken = undefined;
}

/**
 * Indicates if the connector connected to the Xplora Cloud service.
 * @returns True, if the connector has a valid GQLHandler and is logged in successfully.
 */
function isConnected() {
	return (gqlHandler && issueToken);
}

/**
 * Indicates if the Xplora authentication token has expired.
 * @returns True, if token has expired.
 */
function hasTokenExpired() {
	return ((Date.now() - dtIssueToken) > (tokenExpiresAfter * 1000));
}

/**
 * Sets the number of retries for failed Xplora API calls.
 * @param {number} retries The wanted number of retries.
 * @returns The number of retries set.
 */
function setMaxRetries(retries) {
	if (retries) maxRetries = retries;

	return maxRetries;
}

/**
 * Sets the amount of time in seconds for retries of failed Xplora API calls before retry.
 * @param {*} seconds The amount of time in seconds for retries of failed Xplora API calls before retry in seconds.
 * @returns The value set.
 */
function setRetryDelay(seconds) {
	if (seconds) retryDelay = seconds;

	return retryDelay;
}

/**
 * Initializes the Xplora Cloud services adapter without logging in.
 * @param {string} countrycode The countrycode (e.g. "+49") for authenticaton.
 * @param {string} phonenumber The phonenumber without countrycode and trailing "+" for authentication.
 * @param {string} password The password for authentication.
 * @param {string} languageCode The languagecode (e.g. "de", "en-US", etc.) for Xplora API data response. Leave blank for system defaults.
 * @param {string} timeZone The timezone (e.g. "Europe/Berlin") for Xplora API data response. Leave blank for system defaults.
 * @param {*} adapter The parent adapter instance.
 */
function initializeConnector(countrycode, phonenumber, password, languageCode, timeZone, adapter) {
	//	Set the parent adapter
	setAdapter(adapter);

	//	Get Xplora login credentials
	COUNTRYCODE = (countrycode ? countrycode : COUNTRYCODE);
	PHONENUMBER = (phonenumber ? phonenumber : PHONENUMBER);
	PASSWORD = (password ? password : PASSWORD);
	LANGUAGECODE = (languageCode ? languageCode : LANGUAGECODE);
	TIMEZONE = (timeZone ? timeZone : TIMEZONE);

	//	Reset GQLHandler. This enforces login on next call.
	logoff();
}

/**
 * ============================================================================
 *					Xplora Cloud service API wrapper functions
 * ============================================================================
 */

/**
 * Wrapper to call Xplora API functions.
 * @param {string} resPropertyName Set to the name of the response's property for the wanted data.
 * @param {*} xpaFunction Set to the Xplora API function to call.
 * @returns Depends on the called Xplora API function.
 */
async function XploraApiCall(resPropertyName, xpaFunction) {
	let retryCounter = 0;
	let dataOk = false;
	let res = undefined;

	while (!dataOk && (retryCounter < maxRetries + 2)) {
		retryCounter++;

		parentAdapter.log.silly(`Xplora API call (${retryCounter}/${maxRetries + 1}) ...`);
		if (retryCounter > 1) parentAdapter.log.debug(`Xplora API call (${retryCounter}/${maxRetries + 1}) ...`);

		//	Ensure we are logged in
		await login(false);

		//	Run GraphQL query
		try {
			res = await xpaFunction();
			if (retryCounter > 1) parentAdapter.log.debug(`Xplora API call (${retryCounter}/${maxRetries + 1}): ${JSON.stringify(res)}`);
		} catch (error) {
			parentAdapter.log.silly(`Xplora API call failed: ${error}`);
			// @ts-ignore
			if (error.response && error.response.errors) {
				res = {
					// @ts-ignore
					errors: error.response.errors
				};
			}
		}

		//	Check response
		dataOk = (res && res[resPropertyName]);

		if (!dataOk) {
			//	Xplora API call failed
			let errorMsg = `Xplora API call failed. Will retry after ${retryDelay} sec. .`;

			// if (res && res.errors) {
			// 	errorMsg=errorMsg + "\n\nError(s):";

			// 	// res.errors.forEach(element => {
			// 	// 	errorMsg = errorMsg + `\n... Error ${element.code}: ${element.message}`;
			// 	// });
			// 	for (let index = 0; index < res.errors.length; index++) {
			// 		const element = res.errors[index];
			// 		errorMsg = errorMsg + `\n... Error ${element.code}: ${element.message}`;
			// 	}
			// }

			if (res && res.errors) errorMsg = `Xplora API call failed: (${res.errors[0].code}) ${res.errors[0].message} --> Will retry after ${retryDelay} sec. .`;

			parentAdapter.log.debug(errorMsg);

			//	Logoff to enforce login at next try.
			logoff();

			//	Sleep a little bit
			await Sleep(retryDelay * 1000);
		}
	}

	//	Return response from Xplora API call (hopefully)
	if (dataOk) {
		return res[resPropertyName];
	}
	else {
		throw new Error(`Xplora API call finally failed with response: ${JSON.stringify(res)}`);
	}
}

/**
 * Get an array of all children based on the issued token.
 * @returns array of children
 */
// exports.getChildren = function() {
// 	const myChildren = [];

// 	if (issueToken && issueToken.user && issueToken.user.children) {
// 		issueToken.user.children.forEach(element => {
// 			myChildren.push(element.ward);
// 		});
// 	}

// 	parentAdapter.log.silly(JSON.stringify(myChildren));

// 	return myChildren;
// };

/**
 * Get the last reported location for a child.
 * @param {string} idChild The id of the child (ward.id)
 * @returns The child's last reported location.
 *
 * WARNING: This async function will throw exceptions for errors!
 */
async function getChildLastLocation(idChild) {
	//	Run the Xplora API call using the wrapper function
	const dmy = await XploraApiCall(
		"watchLastLocate",
		() => gqlHandler.getWatchLastLocation(idChild)
	);

	return (dmy ? dmy : undefined);

	// let myWatchLastLocation = undefined;

	// try {
	// 	//	Ensure we are connected to the Xplora Cloud service
	// 	if (await login()) {
	// 		// const res = await gqlHandler.getWatchLastLocation(idChild);

	// 		let retryCounter = 0;
	// 		let dataOk = false;
	// 		let res = undefined;

	// 		while (!dataOk && (retryCounter < maxRetries + 2)) {
	// 			retryCounter++;

	// 			parentAdapter.log.debug(`Running query getWatchLastLocation (${retryCounter} / ${maxRetries + 1}) ...`);

	// 			//	Run GraphQL query
	// 			await login();
	// 			try {
	// 				res = await gqlHandler.getWatchLastLocation(idChild);
	// 			} catch (error) {
	// 				parentAdapter.log.warn(`Error getting last location: ${error}`);
	// 			}

	// 			//	Check response
	// 			dataOk = (res && res.watchLastLocate);

	// 			if (!dataOk) {
	// 				parentAdapter.log.warn(`Running query getWatchLastLocation failed (${retryCounter} / ${maxRetries + 1}). Will retry after ${retryDelay} sec. ...`);
	// 				if (res && res.errors) {
	// 					res.errors.forEach(element => {
	// 						parentAdapter.log.warn(`... Error ${element.code}: ${element.message}`);
	// 					});
	// 				}

	// 				logoff();
	// 				await Sleep(retryDelay * 1000);
	// 			}
	// 		}

	// 		if (res && res.watchLastLocate) {
	// 			myWatchLastLocation = res.watchLastLocate;
	// 		}
	// 		else {
	// 			throw new Error(`Failed to get last location for child id ${idChild} with response: ${JSON.stringify(res)}`);
	// 		}
	// 	}
	// 	else {
	// 		throw new Error("You have to login first.");
	// 	}
	// } catch (error) {
	// 	parentAdapter.log.error(`Failed to get last location: ${error}`);
	// }
}

/**
 * ============================================================================
 * 								Xplora data parser
 * ============================================================================
 */

function getXploraUserData(user) {
	if (!user) return undefined;

	const res = {};

	res.id = user.id;
	res.name = user.name;
	res.nickname = user.nickname;
	res.phonenumber = `+${user.countryPhoneCode}${user.phoneNumber}`;

	if (user.emailAddress) res.email = user.emailAddress;

	if (user.create) res.createdAt = (user.create * 1000);
	if (user.update) res.modifiedAt = (user.update * 1000);

	if (user.xcoin) res.xcoin = user.xcoin;
	if (user.currentStep) res.currentStep = user.currentStep;
	if (user.totalStep) res.totalStep = user.totalStep;

	return res;
}

function getXploraLocationData(location) {
	if (!location) return undefined;

	const res = {
		timeStamp: (location.tm * 1000),
		lat: parseFloat(location.lat),
		lng: parseFloat(location.lng),
		radius: location.rad,
		locateType: location.locateType,
		country: location.country,
		countryCode: location.countryAbbr,
		province: location.province,
		city: location.city,
		addr: location.addr,
		poi: location.poi,
		battery: location.battery,
		isCharging: location.isCharging,
		isAdjusted: location.isAdjusted,
		step: location.step,
		distance: location.distance,
		isInSafeZone: location.isInSafeZone,
		safeZoneLabel: location.safeZoneLabel
	};

	//	Build full address
	res.fullAddr = `${res.poi}, ${res.city}, ${res.province}, ${res.country}`;

	return res;
}

function initializePollData(myIssueToken) {
	const dmyIT = (myIssueToken || issueToken);
	const res = {
		timeStamp: Date.now()
	};

	// console.dir(dmyIT, { depth: null });

	//	Set info for logged in user
	if (dmyIT.user) {
		res.user = getXploraUserData(dmyIT.user);
	}

	//	Add children
	if (dmyIT.user && dmyIT.user.children) {
		res.children = [];

		dmyIT.user.children.forEach(child => {
			res.children.push(getXploraUserData(child.ward));
		});
	}

	return res;
}

async function updateChildrenLocation(res) {
	if (res.children) {
		// await res.children.forEach(async child => {
		// 	const childLocation = await getWatchLastLocation(child.id);
		// 	child.location = childLocation;
		// });
		for (let index = 0; index < res.children.length; index++) {
			//	Get last known location for a child
			parentAdapter.log.debug(`Get last known location for child ${res.children[index].name} (id ${res.children[index].id}) ...`);
			try {
				const dmy = await getChildLastLocation(res.children[index].id);
				if (dmy) res.children[index].location = getXploraLocationData(dmy);
			} catch (error) {
				parentAdapter.log.error(`Failed to get location for child ${res.children[index].name} (id ${res.children[index].id}): ${JSON.stringify(error)}`);
			}
			// const childLocation = getXploraLocationData(await getWatchLastLocation(res.children[index].id));
			// res.children[index].location = childLocation;
		}
	}

	return res;
}

/**
 * ============================================================================
 * 									EXPORTS
 * ============================================================================
 */

/**
 * Set the parent ioBroker adapter instance for the connector
 * @param {*} adapter The parent adapter instance.
 * @returns The parent adapter instance for chaining.
 */
function setParentAdapter(adapter) {
	setAdapter(adapter);

	return adapter;
}

/**
 * Initializes the connector but does not try to login.
 * @param {*} countrycode
 * @param {*} phonenumber
 * @param {*} password
 * @param {*} languageCode
 * @param {*} timeZone
 * @param {*} adapter
 */
function initConnector(countrycode, phonenumber, password, languageCode, timeZone, adapter) {
	//	Set the parent adapter for the connector.
	setAdapter(adapter);

	//	Initialize the Xplora connector
	// @ts-ignore
	initializeConnector(countrycode, phonenumber, password, languageCode, timeZone);
}

/**
 * Log in to the Xplora Cloud service
 * @param {*} countrycode
 * @param {*} phonenumber
 * @param {*} password
 * @param {*} languageCode
 * @param {*} timeZone
 * @param {*} adapter
 * @returns issueToken
 */
async function loginConnector(countrycode, phonenumber, password, languageCode, timeZone, adapter) {
	// //	Set parent adapter
	// exports.setParentAdapter(adapter);

	// //	Get Xplora login credentials
	// COUNTRYCODE = (countrycode ? countrycode : COUNTRYCODE);
	// PHONENUMBER = (phonenumber ? phonenumber : PHONENUMBER);
	// PASSWORD = (password ? password : PASSWORD);
	// LANGUAGECODE = (languageCode ? languageCode : LANGUAGECODE);
	// TIMEZONE = (timeZone ? timeZone : TIMEZONE);

	// if (!parentAdapter) throw new Error("Adapter instance is missing.");

	// try {
	// 	//	Create a new GraphQL Handler for querying the Xplora Cloud service
	// 	parentAdapter.log.silly("Creating new GraphQL Handler");
	// 	gqlHandler = new xpa.GQLHandler(
	// 		COUNTRYCODE, PHONENUMBER, PASSWORD,
	// 		LANGUAGECODE, TIMEZONE
	// 	);

	// 	if (gqlHandler) {
	// 		//	Login to Xplora Cloud service
	// 		issueToken = await gqlHandler.login();

	// 		if (issueToken) parentAdapter.log.debug(`Successfully logged in with ${COUNTRYCODE} ${PHONENUMBER}`);
	// 	}
	// 	else {
	// 		throw new Error("Unknown error creating a new GraphQL handler instance.");
	// 	}
	// } catch (error) {
	// 	//	Login failed.
	// 	gqlHandler = undefined;
	// 	issueToken = undefined;

	// 	parentAdapter.log.error(`Failed to login to Xplora Cloud service: ${error}`);
	// }

	// return issueToken;

	try {
		//	Init connector
		initConnector(countrycode, phonenumber, password, languageCode, timeZone, adapter);

		//	Login with initialized credentials
		await login(true);

		initializePollData();

		return issueToken;
	} catch (error) {
		return false;
	}
}

// /**
//  * Checks if the connector connected to the Xplora Cloud service.
//  * @returns True, if the connector has a valid GQLHandler and is logged in successfully.
//  */
// function isConnected() {
// 	return isConnected();
// };

/**
 * Runs a full data poll againstnthe Xplora Cloud service.
 * @returns Xplora data
 */
async function fullDataPoll() {
	//	Initialize poll data
	xploraData = initializePollData();

	//	Get last reported location for each child
	await updateChildrenLocation(xploraData);

	return xploraData;
}

module.exports = {
	setParentAdapter,
	initConnector,
	loginConnector,
	isConnected,
	fullDataPoll,
	setMaxRetries,
	setRetryDelay,
	logoff,
	updateChildrenLocation
};
