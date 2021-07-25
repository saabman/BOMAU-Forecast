const NodeHelper = require('node_helper');
var request = require('request');
const fetch = require('node-fetch');
var moment = require('moment');
const ftp = require("basic-ftp");
const xml2js = require('xml2js');
const fs = require('fs');

module.exports = NodeHelper.create({
  start: function() {
    this.config = null;
	},

fetchData: function() {
  if (this.config === null) {
      return
  }
  console.log("fetching data");
  this.downloadForecast();
  console.log("have we returned");
},

downloadForecast: function() {
    wtf().then(this.convertWeather());
    async function wtf() {
      const client = new ftp.Client();
      client.ftp.verbose = true;
      try {
        await client.access({
          host: "ftp.bom.gov.au"
        })
          console.log(await client.list())
          await client.downloadTo("weatherdata.xml", "/anon/gen/fwo/IDN11107.xml")
      }
      catch(err) {
          console.log("error" + err);
          this.sendSocketNotification("NETWORK_ERROR", err);
      }
      client.close();
    }

},

convertWeather: function (){
    console.log("convertWeather");
    const xml = fs.readFileSync("weatherdata.xml");
    xml2js.parseString(xml, {mergeAttrs: true}, (err, result) => {
        if (err) {
          console.log("convertWeather error");
          throw err;

        }
    const json = JSON.stringify(result, null, 4);
    this.sendSocketNotification("forecastAvailable", json);
    //console.log("forecast" + json);
    fs.writeFileSync('weatherdata.json',json);
    console.log("weatherdata written");
    });
},


socketNotificationReceived: function(notification, payload) {
      switch(notification) {
      case "SET_CONFIG":
      this.config = payload;
      break;

      case "FETCH_DATA":
      this.fetchData();
      break;
    }
	}
});
