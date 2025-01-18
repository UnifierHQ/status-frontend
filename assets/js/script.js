const endpoint = "https://statsapi.unifierhq.org/api/v1/"; // API endpoint

const headers = new Headers({
    'Accept':'application/json'
})

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
        applyStatus(responseJson);
    }).catch(error => {
        console.error(error);
        applyFailedStatus();
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
                    "status": 3,
                    "ping": 50
                }
            }
        }
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * (max - 1)) + 1;
    }

    const statusHistory = [];

    const currentTime = Math.floor(Date.now() / 1000);

    for (let i = 0; i < 30; i++) {
        statusHistory.push({"status": 0, "ping": getRandomInt(500), "timestamp": currentTime - (300 * i)});
    }

    responseJson["web"]["services"]["unifier-web"]["history"] = statusHistory;

    applyStatus(responseJson);
}

function applyStatus(data) {
    // Get main container
    const mainContainer = document.getElementById("main-container");
    let globalMaxDisruption = 0;

    for (let i = 0; i < Object.keys(data).length; i++) {
        // Get data
        const groupIdentifier = Object.keys(data)[i];
        const groupData = data[groupIdentifier];

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
            const serviceIdentifier = Object.keys(groupData["services"])[i2];
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

            if (serviceData["history"] !== undefined) {
                const serviceHistoryData = serviceData["history"];
                const serviceHistoryElement = service.querySelector(".status-history");
                const serviceHistoryTemplate = document.getElementById("history-template");

                let maxPing = 0;

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
                    } else {
                        if (historyData["ping"] > maxPing) {
                            maxPing = historyData["ping"];
                        }

                        historyElement.setAttribute("ping", Math.round(historyData["ping"]));
                    }

                    // Set timestamp
                    const historyTime = new Date(historyData["timestamp"] * 1000);
                    historyElement.setAttribute("timestamp", historyTime.toLocaleString());

                    // Add history to container
                    serviceHistoryElement.appendChild(historyElement);
                }

                console.log(serviceHistoryElement.children);

                // Render
                renderHistory(serviceHistoryElement, maxPing);
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

function applyFailedStatus() {

}

function renderHistory(element, maximum) {
    const historyElements = element.querySelectorAll(".history");

    for (let i = 0; i < historyElements.length; i++) {
        const historyElement = historyElements[i];
        const historyBar = historyElement.querySelector(".history-bar");
        const ping = historyElement.getAttribute("ping");

        if (ping === null) {
            historyBar.style.height = "0";
        } else {
            const height = Math.round((ping / maximum) * 100);
            historyBar.style.height = height + "%";
        }
    }
}

function onLoad() {
    //fetchStatus(); (backend is WIP)
    dummyStatus();
}

window.onload = onLoad;