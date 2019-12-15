"use strict";

const { actionssdk, Permission, Suggestions } = require("actions-on-google");
const functions = require("firebase-functions");

const app = actionssdk({ debug: true });

app.intent("actions.intent.MAIN", conv => {
  conv.ask(`Hi! I can show you different types of helpers.`);
  conv.ask(`Which would you like to see?`);
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
app.intent("actions.intent.PERMISSION", (conv, confirmationGranted) => {
  // Also, can access latitude and longitude
  // const { latitude, longitude } = location.coordinates;
  const { location } = conv.device;
  const { name } = conv.user;
  if (confirmationGranted && name && location) {
    conv.ask(
      `Okay ${name.display}, I see you're at ` + `${location.formattedAddress}`
    );
  } else {
    conv.ask(`Looks like I can't get your information.`);
  }
  conv.ask(`Would you like to try another helper?`);
  conv.ask(new Suggestions(["Confirmation"]));
});
// [END asdk_js_permission_accepted]

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
