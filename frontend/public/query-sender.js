/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        let url = "http://localhost:4321/query";
        let http = new XMLHttpRequest();
        http.open("POST", url, true);
        http.setRequestHeader("Content-Type", "application/json");
        http.onload = function() {
            let response = http.response;
            if (response.status === 200) {
                resolve();
            } else {
                reject();
            }
        }
        http.send(JSON.stringify(query));
    });
};
