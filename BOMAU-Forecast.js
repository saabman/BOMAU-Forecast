/* Magic Mirror - WallberryTheme <3
 * Module: BOMAU-Forecast
 *
 * By JSC (@delightedCrow)
 * Modified by Bernie for use withe BOM.gov.au 2020
 * MIT Licensed.
 */
Module.register("BOMAU-Forecast", {
	// Module config defaults.
	defaults: {
		daysToForecast: 5, // how many days to include in upcoming forecast

    		updateInterval: 4 * (60 * 60 * 1000), // 4 hours
   			initialLoadDelay: 1000,
    		retryDelay: 2500
	},

	fetchTimer: null,

	wdata: {
		maxForecastPossible: 8, // DarkSky only allows for up to 8 days
		fetchError: null,
		fetchResponse: null,
	},

	precipIcons: { // icons for displaying type of precipitation
		"default": "wi-raindrop",
		"12": "wi-raindrop",
		"snow": "wi-snowflake-cold"
	},

	// Map icons from BOM - This list may need adjusting depending on what BOM
	// gives us over time.
	convertForecastType(forecastType) {
		const forecastTypes = {
					"1":"day-sunny",
					"2": "night-clear",
					"3": "day-sunny-overcast",
					"4": "day-cloudy",
					"6": "day-haze",
					"8":"rain-mix",
					"9":"windy",
					"10":"day-fog",
					"11":"day-showers",
					"12":"day-rain",
					"13":"dust",
					"14":"snowflake-cold",
					"15":"snow",
					"16":"thunderstorm",
					"17":"day-showers",
					"18":"day-rain",
					"19":"hurricane"
				};
		return forecastTypes.hasOwnProperty(forecastType) ? forecastTypes[forecastType] : null;
	},

	convertWeatherType(weatherType) {
		const weatherTypes = {
					"-": "clear",
					"Clear": "clear",
					"Cloudy": "cloudy",
					"Partly cloudy": "partly-cloudy"
				};
		return weatherTypes.hasOwnProperty(weatherType) ? weatherTypes[weatherType] : null;
	},

	translationKey: {
		loading: "WLOADING",
		invalidKey: "API_KEY_MISSING",
		today: "TODAY",
		connectionError: "CONNECTION_ERROR",
		error: "ERROR"
	},

	getTranslations: function() {
		return {
			en: "translations/en.json"
		}
	},

	getScripts: function() {
		return ["moment.js"]
	},

	getStyles: function() {
		return ["weather-icons.css", "BOMAU-Forecast.css"]
	},

	getTemplate: function() {
		return "BOMAU-Forecast.njk"
	},

	getTemplateData: function() {
		return {
			config: this.config,
			weather: this.getWeatherDataForTemplate(),
			status: this.getStatusDataForTemplate()
		};
	},

	start: function() {
		Log.info("Starting module: " + this.name);
			this.sendSocketNotification("SET_CONFIG", this.config);
			this.scheduleUpdate(this.config.initialLoadDelay);
		//}
	},

	suspend: function() {
		Log.info("Suspending BOMAU-Forecast...");
		clearTimeout(this.fetchTimer);
	},

	resume: function() {
		this.start();
	},

	scheduleUpdate: function(delay=null) {
		var nextFetch = this.config.updateInterval;
		console.log(nextFetch);
		if (delay !== null && delay >= 0) {
			nextFetch = delay;
		}
		this.fetchTimer = setTimeout(() => {this.sendSocketNotification("FETCH_DATA")}, nextFetch);
	},

	socketNotificationReceived: function(notification, currentWeather) {

		switch(notification) {

			case "forecastAvailable":
				//console.log("forcast available",currentWeather);
				this.wdata.fetchForecast = currentWeather;
				this.scheduleUpdate();
	//			console.log(this.wdata.fetchForecast);
				break;

		}

		this.updateDom();
	},

	// this handles getting the translated error/loading messages for the template
	getStatusDataForTemplate: function() {
		var status = {}
		// if fetchResponse is null then we haven't gotten data yet - we're still loading (unless we have an empty API key - then we'll never load anything!)
		/*if (!this.wdata.fetchResponse) {
			status.loadingMessage = this.translate(this.translationKey.loading);
			console.log (status);
			return status;
		}

		// DarkSky status code of 403 or a missing API key results in INVALID KEY error
		if (this.wdata.fetchResponse.status == 403) {
			status.error = this.translate(this.translationKey.invalidKey);
			return status;
		}

		// DarkSky sent us an error of some kind, probably user supplied an incorrect config parameter
		if (this.wdata.fetchResponse.status != 200) {
			//console.log(this.wdata.fetchResponse.body);
			let errorObj = JSON.parse(this.wdata.fetchResponse.body);
			status.error = this.translate(this.translationKey.error) + errorObj.error;
			return status;
		}

		// Looks like we got a network error
		if (this.wdata.fetchError != null) {
			status.error = this.translate(this.translationKey.connectionError);
			return status;
		}*/
	},

	// handles processing all the weather data for the template
	getWeatherDataForTemplate: function() {

		if (this.wdata.fetchForecast == null) {
			console.log ("if we don't have weather data we can just return now");
			return null;
		}

		let bomForecast = JSON.parse(this.wdata.fetchForecast);
		console.log(bomForecast);
		var weather = {};
    		weather.forecast = [];

// THis section takes the Forecast Information and picks out the bits to display
		for (var i=0; i<this.config.daysToForecast; i++) {  //the number of days the forcast runs for
			var day = {};

			let forecast = bomForecast.product.forecast[0].area[1]["forecast-period"][i];
			// The current day forecast doesn display minimum temperature so we check for current day (0)
			// and modify result fied locations.
			if (i==0) {
							if (typeof (forecast.element[1])=="undefined") {
								day.highTemp == "null";
							}
							else {
							day.highTemp = Math.round(forecast.element[1]["_"]);
						}
			}
			else {
			// As we are using a self generated JSON file from an XML the postion of the max and min temperature values varies
			// if the is a rain fall figgure for the day. As Max temp is the last field check to see if it is invaild if it is move
			// make an adjustment for the shift in the data.
			if (forecast.element[3] == undefined) {
				day.highTemp = Math.round(forecast.element[2]["_"]);

				day.lowTemp = Math.round(forecast.element[1]["_"]);
			}
			else {
		day.highTemp = Math.round(forecast.element[3]["_"]);

		day.lowTemp = Math.round(forecast.element[2]["_"]);
		}
	}
		day.precipProbability = (forecast.text[2]["_"]);
		day.precipType = forecast.hasOwnProperty("precipType") ? this.precipIcons[forecast.precipType] : this.precipIcons["default"];
		day.icon = this.convertForecastType(forecast.element[0]["_"]);

		//day.icon = forecast.element[0]["_"];
			console.log("icon "+ day.icon)
			//var date = forecast["start-time-local"][0];
			var date = new Date(forecast["start-time-local"][0]); // not sure about the x1000 here
			console.log(date);
			day.dayLabel = moment.weekdaysShort(date.getDay());


			// changing the day label to "today" instead of day of the week
			if (i === 0) {
				day.dayLabel = this.translate(this.translationKey.today);
						}
			weather.forecast.push(day);
		}
		console.log(weather);
		return weather;
	}
	});
