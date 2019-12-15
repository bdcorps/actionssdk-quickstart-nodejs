"use strict";

const {
  actionssdk,
  Permission,
  Suggestions,
  BasicCard,
  Button,
  Image,
  SimpleResponse
} = require("actions-on-google");
const functions = require("firebase-functions");
const request = require("request-promise-native");
var NodeGeocoder = require("node-geocoder");

const app = actionssdk({ debug: true });

var options = {
  provider: "google",

  // Optional depending on the providers
  httpAdapter: "https", // Default
  apiKey: "AIzaSyBTTuGZdZbFlZCf0dpN5WhMRmHuVN-UY0k", // for Mapquest, OpenCage, Google Premier
  formatter: null // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options);

app.intent("actions.intent.MAIN", conv => {
  permission(conv);
  conv.ask(`You poo ppoo`);
  conv.ask(new Suggestions(["Permission"]));
});

app.intent("actions.intent.TEXT", (conv, input) => {
  const query = input.toLowerCase();
  if (query === "permission") {
    return permission(conv);
  } else {
    conv.ask(`You didn't name a supported helper!`);
    conv.ask(`Which one would you like to see?`);
    return;
  }
});

const permission = conv => {
  // [START asdk_js_permission_reason]
  const permissions = ["NAME"];
  let context = "To address you by name";
  // Location permissions only work for verified users
  // https://developers.google.com/actions/assistant/guest-users
  if (conv.user.verification === "VERIFIED") {
    // Could use DEVICE_COARSE_LOCATION instead for city, zip code
    permissions.push("DEVICE_PRECISE_LOCATION");
    context += " and know your location";
  }
  const options = {
    context,
    permissions
  };
  conv.ask(new Permission(options));
  // [END asdk_js_permission_reason]
};

// [START asdk_js_permission_accepted]
app.intent("actions.intent.PERMISSION", async (conv, confirmationGranted) => {
  // Also, can access latitude and longitude
  // const { latitude, longitude } = location.coordinates;
  const { location } = conv.device;
  const { name } = conv.user;
  if (confirmationGranted && name && location) {
    return new Promise(function(resolve, reject) {
      geocoder.geocode(`${location.formattedAddress}`, async function(
        err,
        res
      ) {
        console.log(res);

        var params = {
          page: 1,
          per_page: 1,
          offset: 0,
          unisex: false,
          lat: `${res[0].latitude}`,
          lng: `${res[0].longitude}`
        };

        let washrooms = await request({
          url: "https://www.refugerestrooms.org/api/v1/restrooms/by_location/",
          qs: params,
          headers: { "Content-type": "application/json" }
        });
        // https://www.google.com/maps/place/
        const washroom = JSON.parse(washrooms)[0];

        const washroomMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          washroom.name,
          washroom.street
        )}&travelMode=walking`;
        var prompt = `The closest washroom is in ${washroom.name} at ${washroom.street}.`;

        conv.ask(prompt);
        // conv.ask(
        //   new SimpleResponse({
        //     speech: prompt,
        //     text: prompt
        //   })
        // );
        conv.ask(
          new BasicCard({
            text: `${washroom.directions} ${washroom.comment}`,
            title: `${washroom.name}`,
            subtitle: `${washroom.street}`,
            buttons: new Button({
              title: "Show directions",
              url: washroomMapUrl
            }),
            display: "CROPPED"
          })
        );
        conv.ask(new Suggestions(["Add Washroom"]));
        resolve();
      });
    });
  } else {
    conv.ask(`Looks like I can't get your information.`);
  }
  // conv.ask(`Would you like to try another helper?`);
});
// [END asdk_js_permission_accepted]

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
