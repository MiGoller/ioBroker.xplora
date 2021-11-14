"use strict";

const GeoUtils = require("geolocation-utils");

let parentAdapter = undefined;
let location_object_type = "LatLng";  //  Available types: 'LonLatTuple', 'LatLon', 'LatLng', 'LatitudeLongitude'.

function setAdapter(adapter) {
	if (adapter) parentAdapter = adapter;

	location_object_type = parentAdapter.config.location_object_type;
}

/**
 * Returns a geo-location object for latitude and longitude
 * @param {*} latitude
 * @param {*} longitude
 */
function getGeoLocation(latitude, longitude) {
	let geoData = "Set LocationObject-type in the adapter instance's settings!";

	if (location_object_type) {
		switch(location_object_type) {
			//  Custom formatters for gps-coordinates
			case "CUSTOM_LatCommaLon":
				geoData = `${latitude},${longitude}`;
				break;

			case "CUSTOM_LatSemicolonLon":
				geoData = `${latitude};${longitude}`;
				break;

			default:
				//  Default: GeoUtils.createLocation
				geoData = JSON.stringify(GeoUtils.createLocation(latitude, longitude, location_object_type));
				break;
		}
	}

	return geoData;
}

async function createDatapoint( key, type, common_role, common_type, common_unit, common_read, common_write) {

	const names = key.split(".");
	let idx = names.length;
	let name = key;
	if (idx > 0) {
		idx--;
		name = names[idx];
	}

	await parentAdapter.setObjectNotExistsAsync(key, {
		type: type,
		common: {
			name: name,
			role: common_role,
			type: common_type,
			unit: common_unit,
			read: common_read,
			write: common_write
		},
		native: { id: key }
	});

	const obj = await parentAdapter.getObjectAsync(key);

	if (obj != null) {

		if (obj.common.role != common_role
            || obj.common.type != common_type
            || obj.common.unit != common_unit
            || obj.common.read != common_read
            || obj.common.write != common_write
            || obj.common.name != name
		) {
			await parentAdapter.extendObject(key, {
				common: {
					name: name,
					role: common_role,
					type: common_type,
					unit: common_unit,
					read: common_read,
					write: common_write
				}
			});
		}
	}
}

async function setDatapointName(key, name) {
	const obj = await parentAdapter.getObjectAsync(key);

	if (obj != null) {

		if (obj.common.name != name) {
			await parentAdapter.extendObject(key, {
				common: {
					name: name
				}
			});
		}
	}
}

async function setDefault(key, value) {
	const current = await parentAdapter.getStateAsync(key);

	//set default only if nothing was set before
	if (current === null || typeof current == undefined || typeof current.val == undefined) {
		parentAdapter.log.info("set default " + key + " to " + value);
		await parentAdapter.setStateAsync(key, { ack: true, val: value });
	}
}

async function createDatapoints(adapter) {
	//	Set the parent adapter instance
	setAdapter(adapter);

	return true;
}

async function publishUser(idParent, user) {
	if (!idParent) throw new Error("Parameter idParent is not set. Aborting.");
	if (!user) throw new Error("Parameter user is not set. Aborting.");

	const key = `${idParent}.${user.id}`;

	parentAdapter.log.silly(`Publishing user with id ${user.id}`);
	try {
		//	Create datapoints for user
		await createDatapoint(key, "channel", "", "string", "", true, false);

		//	Name
		if (user.name) {
			await createDatapoint(`${key}.name`, "state", "value", "string", "", true, false);
			await setDatapointName(key, user.name);
			await parentAdapter.setStateAsync(`${key}.name`, { val: user.name, ack: true });
		}

		//	Nickname
		if (user.nickname) {
			await createDatapoint(`${key}.nickname`, "state", "value", "string", "", true, false);
			await parentAdapter.setStateAsync(`${key}.nickname`, { val: user.nickname, ack: true });
		}

		//	Phonenumber
		if (user.phonenumber) {
			await createDatapoint(`${key}.phonenumber`, "state", "value", "string", "", true, false);
			await parentAdapter.setStateAsync(`${key}.phonenumber`, { val: user.phonenumber, ack: true });
		}

		//	Email address
		if (user.email) {
			await createDatapoint(`${key}.email`, "state", "value", "string", "", true, false);
			await parentAdapter.setStateAsync(`${key}.email`, { val: user.email, ack: true });
		}

		//	CreatedAt timestamp
		if (user.createdAt) {
			await createDatapoint(`${key}.createdAt`, "state", "value.time", "number", "", true, false);
			await parentAdapter.setStateAsync(`${key}.createdAt`, { val: user.createdAt, ack: true });
		}

		//	ModifiedAt timestamp
		if (user.modifiedAt) {
			await createDatapoint(`${key}.modifiedAt`, "state", "value.time", "number", "", true, false);
			await parentAdapter.setStateAsync(`${key}.modifiedAt`, { val: user.modifiedAt, ack: true });
		}

		//	Today's steps and distance from location data
		// if (user.location) {
		// 	if (user.location.step) {
		// 		await createDatapoint(`${key}.todayStep`, "state", "value", "number", "", true, false);
		// 		await parentAdapter.setStateAsync(`${key}.todayStep`, { val: user.location.step, ack: true });
		// 	}

		// 	if (user.location.distance) {
		// 		await createDatapoint(`${key}.todayDistance`, "state", "value", "number", "", true, false);
		// 		await parentAdapter.setStateAsync(`${key}.todayDistance`, { val: user.location.distance, ack: true });
		// 	}
		// }
	} catch (error) {
		//	Failed to create datapoints or to update states.
		parentAdapter.log.error(`Failed to publish user with id ${user.id}: ${JSON.stringify(error)}`);
	}
}

async function publishLocation(idParent, location) {
	const key = `${idParent}.location`;

	//	Create datapoints for location
	await createDatapoint(key, "channel", "", "string", "", true, false);

	await createDatapoint(`${key}.timeStamp`, "state", "value.time", "number", "", true, false);
	await createDatapoint(`${key}.lat`, "state", "value", "number", "", true, false);
	await createDatapoint(`${key}.lng`, "state", "value", "number", "", true, false);
	await createDatapoint(`${key}.radius`, "state", "value", "number", "", true, false);
	await createDatapoint(`${key}.locateType`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.country`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.countryCode`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.province`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.city`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.address`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.poi`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.fullAddress`, "state", "value", "string", "", true, false);
	await createDatapoint(`${key}.battery`, "state", "value", "number", "", true, false);
	await createDatapoint(`${key}.isCharging`, "state", "value", "boolean", "", true, false);
	await createDatapoint(`${key}.isAdjusted`, "state", "value", "boolean", "", true, false);
	await createDatapoint(`${key}.step`, "state", "value", "number", "", true, false);
	await createDatapoint(`${key}.distance`, "state", "value", "number", "", true, false);
	await createDatapoint(`${key}.isInSafeZone`, "state", "value", "boolean", "", true, false);
	await createDatapoint(`${key}.safeZoneLabel`, "state", "value", "string", "", true, false);

	await createDatapoint(`${key}.gps-coordinates`, "state", "value.gps", "string", "", true, false);

	//	Set the values
	await parentAdapter.setStateAsync(`${key}.timeStamp`, { val: location.timeStamp, ack: true });
	await parentAdapter.setStateAsync(`${key}.lat`, { val: location.lat, ack: true });
	await parentAdapter.setStateAsync(`${key}.lng`, { val: location.lng, ack: true });
	await parentAdapter.setStateAsync(`${key}.radius`, { val: location.radius, ack: true });
	await parentAdapter.setStateAsync(`${key}.locateType`, { val: location.locateType, ack: true });
	await parentAdapter.setStateAsync(`${key}.country`, { val: location.country, ack: true });
	await parentAdapter.setStateAsync(`${key}.countryCode`, { val: location.countryCode, ack: true });
	await parentAdapter.setStateAsync(`${key}.province`, { val: location.province, ack: true });
	await parentAdapter.setStateAsync(`${key}.city`, { val: location.city, ack: true });
	await parentAdapter.setStateAsync(`${key}.address`, { val: location.addr, ack: true });
	await parentAdapter.setStateAsync(`${key}.poi`, { val: location.creatpoiedAt, ack: true });
	await parentAdapter.setStateAsync(`${key}.fullAddress`, { val: location.fullAddr, ack: true });
	await parentAdapter.setStateAsync(`${key}.battery`, { val: location.battery, ack: true });
	await parentAdapter.setStateAsync(`${key}.isCharging`, { val: location.isCharging, ack: true });
	await parentAdapter.setStateAsync(`${key}.isAdjusted`, { val: location.isAdjusted, ack: true });
	await parentAdapter.setStateAsync(`${key}.step`, { val: location.step, ack: true });
	await parentAdapter.setStateAsync(`${key}.distance`, { val: location.distance, ack: true });
	await parentAdapter.setStateAsync(`${key}.isInSafeZone`, { val: location.isInSafeZone, ack: true });
	await parentAdapter.setStateAsync(`${key}.safeZoneLabel`, { val: location.safeZoneLabel, ack: true });

	await parentAdapter.setStateAsync(`${key}.gps-coordinates`, { val: getGeoLocation(location.lat, location.lng), ack: true });
}

async function publishChild(idParent, child) {
	const key = `${idParent}.${child.id}`;

	//	Publish the child's user data
	await publishUser(idParent, child);

	//	... and additional child data
	//	XCoins
	if (child.xcoin) {
		await createDatapoint(`${key}.xcoin`, "state", "value", "number", "", true, false);
		await parentAdapter.setStateAsync(`${key}.xcoin`, { val: child.xcoin, ack: true });
	}

	//	Current steps
	if (child.currentStep) {
		await createDatapoint(`${key}.currentStep`, "state", "value", "number", "", true, false);
		await parentAdapter.setStateAsync(`${key}.currentStep`, { val: child.currentStep, ack: true });
	}

	//	Total steps
	if (child.totalStep) {
		await createDatapoint(`${key}.totalStep`, "state", "value", "number", "", true, false);
		await parentAdapter.setStateAsync(`${key}.totalStep`, { val: child.totalStep, ack: true });
	}

	//	Publish the child's location
	if (child.location) publishLocation(key, child.location);
}

async function publishChildren(idParent, children) {
	//	Create datapoints for children
	await createDatapoint(`${idParent}.numberOfChildren`, "state", "value", "number", "", true, false);

	//	Set values
	await parentAdapter.setStateAsync(`${idParent}.numberOfChildren`, { val: children.length, ack: true });

	//	Publish each child
	for (let index = 0; index < children.length; index++) {
		const child = children[index];
		await publishChild(idParent, child);
	}
}

async function publishXploraData(data) {
	if (!data) return false;

	//	Publish user (guardian)?
	if (data.user) await publishUser("users", data.user);

	//	Publish children?
	if (data.children) await publishChildren("children", data.children);

	return true;
}

module.exports = {
	setAdapter,
	createDatapoint,
	setDefault,
	createDatapoints,
	publishXploraData
};
