var currentShows = [];
var updated = [];
var trackedShows = [];
chrome.runtime.onConnect.addListener(function() {
	myPort.postMessage({
		"messageType": "get"
	});
	console.log(trackedShows);
});
var myPort = chrome.runtime.connect();
// Parse messages from background.js
myPort.onMessage.addListener(function(m) {
	// Refresh every minute or so to get New Releases
	// Wait for an alarm message from background.js
	console.log("Got a message of type: " + m.messageType);
	if (m.messageType === "alarm") {
		update();
		console.log("content script has been alarmed")
	} else {
		// m.messageType == "get"
		trackedShows = m.data.data;
	}
	return true;
});

console.log("starting");
// Copy horriblesubs's jquery on('click', '.refreshbutton') code
function refresh() {
	$.ajax({
		url: '/lib/latest.php',
		success: function(html) {
			$('.latest').fadeOut(function () {
				$('.latest').html(html).fadeIn();
				add_ep_click_event();
			});
			$('.morebox').html('<a href="#" style="display: block;" class="morebutton" id="0">Show more</a>');
			$('.refreshlink a').html('<i class="dashicons dashicons-update" title="Refresh"></i>');
		}
	});
}

function add_ep_click_event() {
	$('.res-link').off('click.hsreleases'); //disable
	$('.res-link').on('click.hsreleases', function() {
        var res_node_ID = $(this).parent().attr('id');        
        var currently_displayed_ID = $(this).parent().parent().attr('data-currentdisplay');
        if(currently_displayed_ID) { //if something's being displayed
            if(currently_displayed_ID == res_node_ID) { //if the same item is selected
                $(this).parent().parent().attr('data-currentdisplay', '');
                $('.'+res_node_ID).slideUp('fast');
            } else { //redraw
                $(this).parent().parent().attr('data-currentdisplay', res_node_ID);
                $('.'+currently_displayed_ID).slideUp('fast', function () {                    
                    $('.'+res_node_ID).slideDown('fast');
                });
            }
        } else { //nothing's being displayed
            $(this).parent().parent().attr('data-currentdisplay', res_node_ID);
            $('.'+res_node_ID).slideDown('fast');
        }
		return false;
	});
}

$('.refreshlink').on('click', '.refreshbutton', function() {
	console.log("waiting");
	$.delay(4000);
	update();
});

function update(message) {
	console.log("Updating.");
	// Get current shows listed
	currentShows = [];
	var latestelems = document.getElementsByClassName("latest");
	var latest = latestelems[0];
	// loop through child nodes, adding div class names to array
	if (latest === undefined || latest === null) {
		console.error("Latest is undefined or null.");
		return;
	}
	for (var child = 0; child < latest.children.length; child++) {
		if (latest.children[child].className.match(/release-links/)){
			currentShows.push(latest.children[child].className);
		}
	}
	// Update
	refresh();
	// Get updated show list
	var newShows = [];
	var latestelems = document.getElementsByClassName("latest");
	var latest = latestelems[0];
	// Add track button to shows in the list
	console.log(latest);
	addTrackerButtons(latest);
	// loop through child nodes, adding div class names to array
	for (var child = 0; child < latest.children.length; child++) {
		if (latest.children[child].className.match(/release-links/)){
			newShows.push(latest.children[child].className);
		}
	}
	// Compare with list of tracked shows in storage
	updated = [];
	for (var show = 0; show < newShows.length; show++) {
		if (!(contains(currentShows, newShows[show])) && isTracked(newShows[show])){
			if (parseShowClass(newShows[show]).episodeNum > latestEpisode(parseShowClass(newShows[show]))) {
				updated.push(parseShowClass(newShows[show]));
			}
		}
	}
	console.log("newShows.length "+newShows.length);
	// Loop through relevant updated shows and send notifications
	console.log("Sending notifications.");
	sendNotifications();
	// Update the list of tracked shows with latest episodes
	console.log("Updating tracked shows.");
	updateTrackedShows();
}

function contains(array, val) {
	var isIn = false;
	for(var i = 0; i < array.length; i++) {
		if (array[i] === val) {
			isIn = true;
		}
	}
	return isIn;
}

function isTracked(classname) {
	// Get show name and resolution from classname
	if (classname === undefined || classname === null) {
		console.error("isTracked classname is undefined or null");
		return;
	}
	var parts = parseShowClass(classname);
	for (var show = 0; show < trackedShows.length; show++) {
		if ((trackedShows[show].title == parts.title) && (trackedShows[show].resolution == parts.resolution)) {
			return true;
		}
	}
	return false;
}

function latestEpisode(classname) {
	var parts = parseShowClass(classname);
	for (var show = 0; show < trackedShows.length; show++) {
		if ((trackedShows[show].title == parts.title) && (trackedShows[show].resolution == parts.resolution)) {
			return trackedShows[show].latestEpisode;
		}
	}
}

function parseShowClass(classname) {
	// may need to tweak the episode number part of this regex
	var parts = classname.match(/release-links\s(.+?)-(\d{2,})-(480p|720p|1080p)/);
	if (parts === undefined || parts === null) {
		console.error("Parts is undefined: " + classname);
		return;
	}
	return {title: parts[1], episodeNum: parts[2], res: parts[3]};
}

function addTrackerButtons(latest) {
	if (!latest) {
		console.error("Latest is undefined or null.");
		return;
	}
	for (var child = 0; child < latest.children.length; child++) {
		if (latest.children[child].className.match(/release-links/)) {
			// navigate down div -> table -> tbody -> tr
			var parentNode = latest.children[child].firstChild.firstChild.firstChild;
			//console.log("parent node " + parentNode);
			var insertHere = latest.children[child].firstChild.firstChild.firstChild.firstChild.nextSibling;
			//console.log("insert here " + insertHere);
			var node = document.createElement("TD");
			node.className = "tracking-label";
			var span = document.createElement("SPAN");
			span.className = "tracking-toggle";
			span.id = latest.children[child].className;
			node.appendChild(span);
			var a = document.createElement("A");
			a.innerHTML = "Track";
			a.href = "#";
			a.title = "Toggle Tracking";
			span.appendChild(a);
			span.addEventListener("click", function() {
				if (isTracked( this.id )) {
					untrack( this.id );
				} else {
					track( this.id );
				}
				return false;
			});
			parentNode.insertBefore(node, insertHere);
			//console.log("Inserted tracking button: "+span.id);
			console.log(node);
		}
	}
}

function track(classname) {
	var data = parseShowClass(classname);
	trackedShows.push({
		title: data.title, 
		res: data.res,
		latestEpisode: data.episodeNum
	});
	sendUpdateMessage();
	console.log(trackedShows);
	console.log("Tracking "+data.title+" in "+data.res);
}

function untrack(classname) {
	var data = parseShowClass(classname);
	for (var show = 0; show < trackedShows.length; show++) {
		if (trackedShows[show].title == data.title && trackedShows[show].res == data.res) {
			trackedShows[show] = {};
		}
	}
	sendUpdateMessage();
	console.log("Untracking "+data.title);
}

// Send message to background script triggering notification
function sendNotifications() {
	for (var i = 0; i < updated.length; i++) {
		myPort.postMessage({
			"messageType": "notify",
			"title": updated[i].title,
			"episodeNum": updated[i].episodeNum,
			"res": updated[i].res
		});
	}
}

// Update list of tracked shows in storage
function updateTrackedShows() {
	// Loop through updated
	for (var show = 0; show < updated.length; show++) {
		trackedShows[updated[show].title].latestEpisode = updated[show].episodeNum;
	}
	// Send message to background.js with updated tracking data
	sendUpdateMessage();
}

function sendUpdateMessage() {
	myPort.postMessage({
		"messageType": "set", 
		"data": {"data": trackedShows}
	});
	console.log("Saving data "+trackedShows);
}

console.log("Starting");
update();