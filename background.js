
var portFromCS;

function connected(p) {
	console.log("runtime.connect connected.");
	portFromCS = p;
	portFromCS.onMessage.addListener(function(m) {
		// Three different types of messages:
		// Request stored data, update stored data, notify
		// Split the single message into show, episode number, and resolution
		if (m.messageType == "notify") {
			notify(m.title, m.episodeNum, m.res);
		} else if (m.messageType == "get") {
			portFromCS.postMessage({
				"messageType": "get",
				"data": chrome.storage.local.get()
			});
		} else if (m.messageType == "set") {
			console.log(m.data);
			if (typeof m.data === 'object') {
				chrome.storage.local.set(m.data);
			}
		}
		return true;
	});
}

chrome.runtime.onConnect.addListener(connected);

// Display a desktop notification with information about the release
function notify(title, episodeNum, res) {
	var notificationMessage = title + " episode " + episodeNum + " released in " + res + ".";
	chrome.notifications.create(
		"episode-release", // ID
		{
			"type": "basic",
			"title": "Episode Released!",
			"message": message
	});
}

// Clear the notification when the user clicks back to HS
chrome.browserAction.onClicked.addListener(function() {
		chrome.notifications.clear("episode-release");
});

const periodInMinutes = 1;

chrome.alarms.create({
	periodInMinutes
});

chrome.alarms.onAlarm.addListener(function() {
	// Send message to content script to refresh
	portFromCS.postMessage({
		"messageType": "alarm"
	});
	console.log("Alarm");
});