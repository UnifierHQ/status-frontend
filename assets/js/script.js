/*
UnifierHQ Status Frontend - A frontend for displaying UnifierHQ service status.
Copyright (C) 2025-present  UnifierHQ

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const endpoint = "https://status-api.unifierhq.org/api/v1/"; // API endpoint

const headers = new Headers({
    'Accept':'application/json'
})

const useDummyData = false; // fake data for testing frontend w/o a working backend
const failDummyData = false; // this throws an error for testing purposes

const navbarData = {
    "links": [
        {
            "href": "/",
            "text": "Home"
        }
    ]
}

function apiPath(path) {
    return endpoint + path;
}

function toggleActive(toggleElement) {
    const parentElement = toggleElement.parentNode;
    const element = parentElement.querySelector(".group-status-container");

    if (element.classList.contains("hidden")) {
        element.classList.remove("hidden");
        toggleElement.classList.remove("hidden");
    } else {
        element.classList.add("hidden");
        toggleElement.classList.add("hidden");
    }
}

function fetchStatus() {
    fetch(apiPath("status"), {
        method: "GET",
        headers: headers
    }).then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error("Status fetch failed");
        }
    }).then(responseJson => {
        if (Object.keys(responseJson).length === 0) {
            applyFailedStatus(true);
            return;
        }
        applyStatus(responseJson);
    }).catch(error => {
        console.error(error);
        applyFailedStatus(false);
    })
}

function dummyStatus() {
    let responseJson = {
        "web": {
            "name": "Websites",
            "description": "UnifierHQ websites",
            "services": {
                "unifier-web": {
                    "name": "Website (unifierhq.org)",
                    "status": 0, // 0: ok, 1: degraded, 2: partial outage, 3: major outage, -1: maintenace, -2: disabled
                    "ping": 100, // use null for no ping,
                    "history": [] // we'll let this be autogenerated
                },
                "collaborators": {
                    "name": "Collaborators (collab.unifierhq.org)",
                    "status": 0,
                    "ping": null
                }
            }
        },
        "bots": {
            "name": "Bots",
            "description": "UnifierHQ bots",
            "services": {
                "unifier": {
                    "name": "Unifier",
                    "status": 0,
                    "ping": 48
                },
                "unifier-origin": {
                    "name": "Unifier Origin",
                    "status": 0,
                    "ping": 50
                },
                "hq-link": {
                    "name": "HQ-Link",
                    "status": 0,
                    "ping": 50
                }
            }
        }
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const statusHistory = [];

    const currentTime = Math.floor(Date.now() / 1000);

    for (let i = 0; i < 90; i++) {
        statusHistory.push({"status": getRandomInt(0, 1), "ping": getRandomInt(450, 500), "timestamp": currentTime - (300 * i)});
    }

    responseJson["web"]["services"]["unifier-web"]["history"] = statusHistory;

    if (failDummyData) {
        console.error("\"Failed\" to get status data (don't worry, this is just a test. Set failDummyData to false to turn this off.)");
        applyFailedStatus(false);
    } else {
        applyStatus(responseJson);
    }

    const headerText = document.getElementById("header-text");
    headerText.innerHTML = headerText.innerHTML + "<br><br><strong>Note: this is fake data used for testing purposes.</strong>"
}

function applyStatus(data) {
    // Get main container
    const mainContainer = document.getElementById("main-container");
    let globalMaxDisruption = 0;

    for (let i = 0; i < Object.keys(data).length; i++) {
        // Get data
        const groupIdentifier = Object.keys(data)[i];
        const groupData = data[groupIdentifier];
        console.log(groupData['services'])
        const sortedServices = Object.keys(groupData["services"]).sort((a, b) => groupData["services"][a]["order"] - groupData["services"][b]["order"]);

        // Create group
        const groupTemplate = document.getElementById("group-template");
        const group = groupTemplate.content.cloneNode(true);
        const groupElement = group.querySelector(".status-group");
        groupElement.id = groupIdentifier;

        // Set group name
        const groupNameElement = group.querySelector(".group-name");
        groupNameElement.innerHTML = groupData["name"];

        // Get total services count and disrupted services count
        const totalServices = Object.keys(groupData["services"]).length;
        let totalDisrupted = 0;
        let maxDisruption = 0;

        // Get status container
        const statusContainer = group.querySelector(".group-status-container");

        for (let i2 = 0; i2 < Object.keys(groupData["services"]).length; i2++) {
            // Get data
            const serviceIdentifier = sortedServices[i2];
            const serviceData = groupData["services"][serviceIdentifier];

            // Create service
            const serviceTemplate = document.getElementById("status-template");
            const service = serviceTemplate.content.cloneNode(true);
            const serviceElement = service.querySelector(".status");
            serviceElement.id = serviceIdentifier;

            // Add disrupted data
            if (serviceData["status"] !== 0) {
                totalDisrupted++;
            }

            if ((serviceData["status"] > maxDisruption || maxDisruption === 0) && serviceData["status"] !== 0) {
                maxDisruption = serviceData["status"];
            }

            // Set service name
            const serviceNameElement = service.querySelector(".status-name");
            serviceNameElement.innerHTML = serviceData["name"];

            // Set status badges
            const serviceBadgeElement = service.querySelector(".status-badge");
            const serviceTextElement = service.querySelector(".status-text");

            if (serviceData["status"] === 0) {
                // Service is online
                serviceBadgeElement.classList.add("online");
                serviceTextElement.innerHTML = "Operational";
            } else if (serviceData["status"] === 1) {
                // Service is degraded
                serviceBadgeElement.classList.add("degraded");
                serviceTextElement.innerHTML = "Degraded performance";
            } else if (serviceData["status"] === 2) {
                // Service is partially down
                serviceBadgeElement.classList.add("partial");
                serviceTextElement.innerHTML = "Partial outage";
            } else if (serviceData["status"] === 3) {
                // Service is down
                serviceBadgeElement.classList.add("down");
                serviceTextElement.innerHTML = "Major outage";
            } else if (serviceData["status"] === -1) {
                // Service is in maintenance
                serviceBadgeElement.classList.add("maintenance");
                serviceTextElement.innerHTML = "Under maintenance";
            } else if (serviceData["status"] === -2) {
                // Service is disabled
                serviceBadgeElement.classList.add("disabled");
                serviceTextElement.innerHTML = "Disabled";
            } else if (serviceData["status"] === -3) {
                // Service is disabled
                serviceBadgeElement.classList.add("disabled");
                serviceTextElement.innerHTML = "Pending";
            } else {
                serviceBadgeElement.classList.add("disabled");
                serviceTextElement.innerHTML = "Unknown";
            }

            // Set latency (if available)
            const servicePingElement = service.querySelector(".status-ping");

            if (serviceData["ping"] === null) {
                servicePingElement.classList.add("hidden");
            } else {
                servicePingElement.innerHTML = Math.round(serviceData["ping"]) + "ms";
            }

            const serviceHistoryElement = service.querySelector(".status-history");

            if (serviceData["history"] !== undefined) {
                const serviceHistoryData = serviceData["history"];
                const serviceHistoryTemplate = document.getElementById("history-template");

                let maxPing = 500;

                // Sort before processing
                serviceHistoryData.sort((a, b) => a["timestamp"] - b["timestamp"]);

                for (let i = 0; i < serviceHistoryData.length; i++) {
                    const historyData = serviceHistoryData[i];
                    const historyPoint = serviceHistoryTemplate.content.cloneNode(true);
                    const historyElement = historyPoint.querySelector(".history");

                    if (historyData["status"] === 0) {
                        // Service is online
                        historyElement.classList.add("online");
                    } else if (historyData["status"] === 1) {
                        // Service is degraded
                        historyElement.classList.add("degraded");
                    } else if (historyData["status"] === 2) {
                        // Service is partially down
                        historyElement.classList.add("partial");
                    } else if (historyData["status"] === 3) {
                        // Service is down
                        historyElement.classList.add("down");
                    } else if (historyData["status"] === -1) {
                        // Service is in maintenance
                        historyElement.classList.add("maintenance");
                    } else {
                        // Other unknown status (don't show)
                        historyElement.classList.add("disabled");
                    }

                    // Set latency (if available)
                    if (historyData["ping"] === null) {
                        historyElement.classList.add("disabled");
                        historyElement.setAttribute("status", Math.round(historyData["status"]));
                    } else {
                        if (historyData["ping"] > maxPing) {
                            maxPing = historyData["ping"];
                        }

                        historyElement.setAttribute("status", Math.round(historyData["status"]));
                        historyElement.setAttribute("ping", Math.round(historyData["ping"]));
                    }

                    // Set timestamp
                    const historyTime = new Date(historyData["timestamp"] * 1000);
                    historyElement.setAttribute("timestamp", historyTime.toLocaleString());

                    // Add history to container
                    serviceHistoryElement.appendChild(historyElement);
                }

                // Render
                renderHistory(serviceHistoryElement, maxPing);
            } else {
                serviceHistoryElement.classList.add("hidden");
            }

            // Add service to group
            statusContainer.appendChild(service);
        }

        // Set status badge and text
        const groupTextElement = group.querySelector(".group-status-text");

        if (totalDisrupted > 0) {
            if (maxDisruption === 1) {
                groupElement.classList.add("degraded");
            } else if (maxDisruption === 2) {
                groupElement.classList.add("partial");
            } else if (maxDisruption === 3) {
                groupElement.classList.add("down");
            } else if (maxDisruption === -1) {
                groupElement.classList.add("maintenance");
            } else {
                // add online anyway since there's no real disruption
                groupElement.classList.add("online");
            }
        } else {
            groupElement.classList.add("online");
        }

        groupTextElement.innerHTML = (totalServices - totalDisrupted) + "/" + totalServices + "<span> operational</span>";

        // Add group to container
        mainContainer.appendChild(group);

        // Set global max disruption (if needed)
        if ((maxDisruption > globalMaxDisruption || maxDisruption === -1) && maxDisruption !== 0) {
            globalMaxDisruption = maxDisruption;
        }
    }

    // Get header
    const headerElement = document.getElementById("header");
    const headerTitleElement = document.getElementById("header-title");
    const headerTextElement = document.getElementById("header-text");
    const headerImageElement = document.getElementById("header-image");

    // Set header status
    if (globalMaxDisruption === 0) {
        headerElement.classList.add("online");
        headerTitleElement.innerHTML = "All systems operational";
        headerTextElement.innerHTML = "Everything is working as expected!";
        headerImageElement.src = "assets/images/online.svg";
    } else if (globalMaxDisruption === 1) {
        headerElement.classList.add("degraded");
        headerTitleElement.innerHTML = "Degraded performance";
        headerTextElement.innerHTML = "Everything is working, but one or more services may behave a bit weirdly.";
        headerImageElement.src = "assets/images/degraded.svg";
    } else if (globalMaxDisruption === 2) {
        headerElement.classList.add("partial");
        headerTitleElement.innerHTML = "Partial outage";
        headerTextElement.innerHTML = "One or more services are experiencing a partial outage. Some things may not work as expected.";
        headerImageElement.src = "assets/images/partial.svg";
    } else if (globalMaxDisruption === 3) {
        headerElement.classList.add("down");
        headerTitleElement.innerHTML = "Major outage";
        headerTextElement.innerHTML = "One or more services are experiencing a major outage. Some things may not work at all.";
        headerImageElement.src = "assets/images/down.svg";
    } else if (globalMaxDisruption === -1) {
        headerElement.classList.add("maintenance");
        headerTitleElement.innerHTML = "Under maintenance";
        headerTextElement.innerHTML = "One or more services are currently under maintenance.";
        headerImageElement.src = "assets/images/maintenance.svg";
    }
}

function applyFailedStatus(isMissing) {
    // Get header
    const headerElement = document.getElementById("header");
    const headerTitleElement = document.getElementById("header-title");
    const headerTextElement = document.getElementById("header-text");
    const headerImageElement = document.getElementById("header-image");

    // Set header status
    headerElement.classList.add("disabled");

    if (isMissing) {
        headerTitleElement.innerHTML = "No status available";
        headerTextElement.innerHTML = "The backend responded, but there's no data. This should fix itself quite soon (probably).";
    } else {
        headerTitleElement.innerHTML = "Well, this is awkward.";
        headerTextElement.innerHTML = "We could not fetch the data from the backend. Maybe try again later.";
    }

    headerImageElement.src = "assets/images/offline.svg";
}

function renderHistory(element, maximum) {
    let historyElements = element.getElementsByClassName("history");

    while (historyElements.length > 90) {
        // too many elements, trim sone
        element.removeChild(historyElements[0]);
    }

    for (let i = 0; i < historyElements.length; i++) {
        const historyElement = historyElements[i];
        const historyBar = historyElement.querySelector(".history-bar");
        const status = parseInt(historyElement.getAttribute("status"));
        const ping = historyElement.getAttribute("ping");

        if (ping === null || status < -1 || status > 3) {
            historyBar.style.height = "100%";
        } else {
            const height = Math.round((ping / maximum) * 100);
            historyBar.style.height = height + "%";
        }

        historyElement.style.width = (Math.min(100/30, 100 / historyElements.length)) + "%";
    }
}

function toggleNavbarList() {
    // NOTE: this is not a linked list (linked lists are fake /j)
    const linksList = document.getElementById('navbar-links-container');
    const toggleElement = document.getElementById('navbar-mobile-toggle');

    if (linksList.classList.contains('active')) {
        linksList.classList.remove('active');
        toggleElement.classList.remove('active');
    } else {
        linksList.classList.add('active');
        toggleElement.classList.add('active');
    }
}

function toggleGraph() {
    // Get toggle
    const toggleElement = document.getElementById('graph-toggle');

    // Get container
    const mainContainer = document.getElementById('main-container');

    if (mainContainer.hasAttribute('disable-history')) {
        mainContainer.removeAttribute('disable-history');
        toggleElement.classList.remove('active');
    } else {
        mainContainer.setAttribute('disable-history', 'true');
        toggleElement.classList.add('active');
    }
}

function onLoad() {
    // Navbar toggle
    document.getElementById('navbar-mobile-toggle').addEventListener('click', toggleNavbarList);

    // Create graph toggle
    const graphToggleTemplate = document.getElementById('toggle-template');
    const graphToggle = graphToggleTemplate.content.cloneNode(true);
    const graphToggleElement = graphToggle.querySelector('.toggle');
    const graphToggleButton = graphToggle.querySelector('.toggle-button');
    const graphToggleText = graphToggle.querySelector('.toggle-text');
    graphToggleElement.id = 'graph-toggle';
    graphToggleText.innerHTML = 'Hide history (use this if the page lags)';

    // Add event listener
    graphToggleButton.addEventListener('click', toggleGraph);

    // Add to settings container
    const settingsContainer = document.getElementById('settings-container');
    settingsContainer.appendChild(graphToggle);

    // Set navbar
    const navbarLinksElement = document.getElementById('navbar-links-container');

    for (let i = 0; i < navbarData.links.length; i++) {
        const link = navbarData.links[i];
        const linkTemplate = document.getElementById('navbar-link-template')
        const linkElement = linkTemplate.content.cloneNode(true);
        const linkElementAnchor = linkElement.querySelector('a');
        linkElementAnchor.href = link.href;
        linkElementAnchor.innerHTML = link.text;

        // Add element to navbar list
        navbarLinksElement.appendChild(linkElement);
    }

    if (useDummyData) {
        dummyStatus();
    } else {
        fetchStatus();
    }
}

window.onload = onLoad;

window.onmousemove = event => {
    const { clientX, clientY } = event;
    const elements = document.querySelectorAll(".history-info");
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const historyElement = element.parentNode;
        const hasParentHover = historyElement.querySelectorAll(":hover").length > 0;
        const historyPoints = historyElement.querySelectorAll(".history");

        if (!hasParentHover) {
            continue;
        }

        element.style.left = (clientX + 10) + "px";
        element.style.top = (clientY + 10) + "px";

        for (let i2 = 0; i2 < historyPoints.length; i2++) {
            const historyPoint = historyPoints[i2];
            const { top, bottom, left, right } = historyPoint.getBoundingClientRect();

            if (clientX >= left && clientX <= right && clientY >= top && clientY <= bottom) {
                // Get data
                const status = parseInt(historyPoint.getAttribute("status"));
                const ping = historyPoint.getAttribute("ping");
                const timestamp = historyPoint.getAttribute("timestamp");

                // Get elements
                const textElement = element.querySelector(".history-info-text");
                const pingElement = element.querySelector(".history-info-ping");
                const timestampElement = element.querySelector(".history-info-time");

                for (let i3 = 0; i3 < element.classList.length; i3++) {
                    const className = element.classList[i3];

                    if (className.startsWith("history-") && className !== "history-info") {
                        element.classList.remove(className);
                    }
                }

                // Determine status
                if (status === 0) {
                    element.classList.add("history-online");
                    textElement.innerHTML = "Operational";
                } else if (status === 1) {
                    element.classList.add("history-degraded");
                    textElement.innerHTML = "Degraded performance";
                } else if (status === 2) {
                    element.classList.add("history-partial");
                    textElement.innerHTML = "Partial outage";
                } else if (status === 3) {
                    element.classList.add("history-down");
                    textElement.innerHTML = "Major outage";
                } else if (status === -1) {
                    element.classList.add("history-maintenance");
                    textElement.innerHTML = "Under maintenance";
                } else {
                    element.classList.add("history-disabled");
                    textElement.innerHTML = "Unknown";
                }

                // Set data
                if (ping === null) {
                    pingElement.innerHTML = "0ms";
                } else {
                    pingElement.innerHTML = ping + "ms";
                }
                timestampElement.innerHTML = timestamp;
                break;
            }
        }
    }
}