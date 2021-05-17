import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import {expect} from "chai";
import Log from "../src/Util";
import {InsightDataset, InsightDatasetKind} from "../src/controller/IInsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import * as fs from "fs-extra";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    let SERVER_URL = "http://localhost:4321";
    const cacheDir = __dirname + "/../data";

    chai.use(chaiHttp);

    before(function () {
        try {
            fs.removeSync(cacheDir);
        } catch (err) {
            Log.trace(err);
        }
        fs.mkdirSync(cacheDir);
        server = new Server(4321);
        server.start();
    });

    after(function () {
        Log.trace("Server Tests ended");
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
        } catch (err) {
            Log.trace(err);
        }
        fs.mkdirSync(cacheDir);
        Server.updateInsight();
    });

    // Basic test for GET request to get Frontend UI
    it("GET test for Frontend UI", function () {
        try {
            let ENDPOINT_URL = "/echo/hello";
            return chai.request(SERVER_URL)
                .get(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // Sample on how to format PUT requests for InsightDataset.Kind = courses
    it("PUT request test for courses dataset", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let expected: string[] = ["courses"];
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("Response received");
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err) {
                    Log.error(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // PUT requests for InsightDataset.Kind = rooms
    it("PUT request test for rooms dataset", function () {
        try {
            let ENDPOINT_URL = "/dataset/rooms/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/rooms.zip");
            let expected: string[] = ["rooms"];
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("Response received");
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err) {
                    Log.error(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // PUT request with invalid ID
    it("PUT request test with invalid ID", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses_invalid/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let expected: string = "Invalid ID";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.error(res);
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                    expect(err.response.body.error).to.deep.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // PUT request with invalid InsightDatasetKind
    it("PUT request test with invalid InsightDatasetKind", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses/burger";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let expected: string = "Invalid Kind";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.error(res);
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                    expect(err.response.body.error).to.deep.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // PUT request with error when adding data of kind courses
    it("PUT request error when adding data of kind courses", function () {
        try {
            let ENDPOINT_URL = "/dataset/noValidCourses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/noValidCourses.zip");
            let expected: string = "Error adding dataset";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.error(res);
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                    expect(err.response.body.error).to.deep.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // PUT request with error when adding data of kind rooms
    it("PUT request error when adding data of kind rooms", function () {
        try {
            let ENDPOINT_URL = "/dataset/noValidRooms/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/noValidRooms.zip");
            let expected: string = "Error adding dataset";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.error(res);
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                    expect(err.response.body.error).to.deep.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // DEL request with valid ID
    it("DEL request with valid ID", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let intExpected: string[] = ["courses"];
            let expected = "courses";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (intRes) {
                    expect(intRes.status).to.be.equal(200);
                    expect(intRes.body.result).to.deep.equal(intExpected);
                    ENDPOINT_URL = "/dataset/courses";
                    return chai.request(SERVER_URL)
                        .del(ENDPOINT_URL)
                        .then(function (res: Response) {
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.be.equal(expected);
                        })
                        .catch(function (err) {
                            Log.trace(err);
                            expect.fail();
                        });
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // DEL request with valid ID of DatasetKind.Rooms
    it("DEL request with ID of DatasetKind.Rooms", function () {
        try {
            let ENDPOINT_URL = "/dataset/rooms/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/rooms.zip");
            let intExpected: string[] = ["rooms"];
            let expected = "rooms";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (intRes) {
                    expect(intRes.status).to.be.equal(200);
                    expect(intRes.body.result).to.deep.equal(intExpected);
                    ENDPOINT_URL = "/dataset/rooms";
                    return chai.request(SERVER_URL)
                        .del(ENDPOINT_URL)
                        .then(function (res: Response) {
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.be.equal(expected);
                        })
                        .catch(function (err) {
                            Log.trace(err);
                            expect.fail();
                        });
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // DEL request with invalid ID
    it("DEL request with invalid ID, returns error", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses_invalid";
            let expected = "Invalid ID";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    Log.trace(res);
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                    expect(err.response.body.error).to.be.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // DEL request with ID not found
    it("DEL request with ID not found, return error", function () {
        try {
            let ENDPOINT_URL = "/dataset/fakeID";
            let expected = "ID not found";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    Log.trace(res);
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(404);
                    expect(err.response.body.error).to.be.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // POST request with valid query
    it ("POST request with valid query", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let expected: any[] = [{courses_dept: "cnps", courses_avg: 99.19},
                {courses_dept: "math", courses_avg: 99.78},
                {courses_dept: "math", courses_avg: 99.78}];
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (intRes) {
                    ENDPOINT_URL = "/query";
                    let QUERY_DATA = {
                        OPTIONS: {
                            COLUMNS: [
                                "courses_dept",
                                "courses_avg"
                            ],
                            ORDER: "courses_dept"
                        },
                        WHERE: {
                            GT: {
                                courses_avg: 99
                            }
                        }
                    };
                    return chai.request(SERVER_URL)
                        .post(ENDPOINT_URL)
                        .send(QUERY_DATA)
                        .set("Content-Type", "application/json")
                        .then(function (res) {
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.deep.equal(expected);
                        }).catch((err) => {
                            Log.trace(err);
                            expect.fail();
                        });
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // POST request with valid query return empty array
    it ("POST request with valid query return empty array", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let expected: any[] = [];
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (intRes) {
                    ENDPOINT_URL = "/query";
                    let QUERY_DATA = {
                        WHERE: {
                            LT: {
                                courses_pass: 0
                            }
                        },
                        OPTIONS: {
                            COLUMNS: [
                                "courses_avg",
                                "courses_pass",
                                "courses_fail",
                                "courses_audit",
                                "courses_year",
                                "courses_dept",
                                "courses_id",
                                "courses_instructor",
                                "courses_title",
                                "courses_uuid"
                            ]
                        }
                    };
                    return chai.request(SERVER_URL)
                        .post(ENDPOINT_URL)
                        .send(QUERY_DATA)
                        .set("Content-Type", "application/json")
                        .then(function (res) {
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.deep.equal(expected);
                        }).catch((err) => {
                            Log.trace(err);
                            expect.fail();
                        });
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // POST request with invalid query
    it ("Post request with invalid query", function () {
        try {
            let ENDPOINT_URL = "/query";
            let QUERY_DATA = {OPTIONS: {}};
            let expected = "Invalid Query";
            return chai.request(SERVER_URL)
                .post(ENDPOINT_URL)
                .send(QUERY_DATA)
                .set("Content-Type", "application/json")
                .then(function (res) {
                    Log.trace(res);
                    expect.fail();
                }).catch((err) => {
                    expect(err.status).to.be.equal(400);
                    expect(err.response.body.error).to.be.equal(expected);
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // POST request with a return result that is too large
    it ("Post request with a return result that is too large", function () {
        try {
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            let intExpected: string[] = ["courses"];
            let expected = "Result too large";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (intRes) {
                    expect(intRes.status).to.be.equal(200);
                    expect(intRes.body.result).to.deep.equal(intExpected);
                    ENDPOINT_URL = "/query";
                    let QUERY_DATA = {
                        WHERE: {},
                        OPTIONS: {
                            COLUMNS: [
                                "courses_dept",
                                "courses_avg"
                            ],
                            ORDER: "courses_avg"
                        }
                    };
                    return chai.request(SERVER_URL)
                        .post(ENDPOINT_URL)
                        .send(QUERY_DATA)
                        .set("Content-Type", "application/json")
                        .then(function (res) {
                            Log.trace(res);
                            expect.fail();
                        }).catch((err) => {
                            expect(err.status).to.be.equal(400);
                            expect(err.response.body.error).to.be.equal(expected);
                        });
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // Basic test for GET request for all datasets
    it("GET request for all datasets", function () {
        try {
            let ENDPOINT_URL = "/dataset/rooms/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/rooms.zip");
            let intExpected: string[] = ["rooms"];
            let expected: InsightDataset[] = [
                {id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364}
            ];
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (intRes) {
                    expect(intRes.status).to.be.equal(200);
                    expect(intRes.body.result).to.deep.equal(intExpected);
                    ENDPOINT_URL = "/datasets";
                    return chai.request(SERVER_URL)
                        .get(ENDPOINT_URL)
                        .then(function (res: Response) {
                            expect(res.status).to.be.equal(200);
                            expect(res.body.result).to.deep.equals(expected);
                        })
                        .catch(function (err) {
                            Log.trace(err);
                            expect.fail();
                        });
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // Basic test for GET request for an empty dataset
    it("GET request for an empty dataset", function () {
        try {
            let ENDPOINT_URL = "/datasets";
            let expected: InsightDataset[] = [];
            return chai.request(SERVER_URL)
                .get(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(expected);
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace(err);
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
