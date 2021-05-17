import * as chai from "chai";
import {assert, expect} from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError,
} from "../src/controller/IInsightFacade";
import Helper from "./InsightFacadeTestHelper";
import InsightFacade from "../src/controller/InsightFacade";
import QueryValidator from "../src/controller/QueryValidator";
import SectionValidator from "../src/controller/SectionValidator";
import TransformationsValidityChecker from "../src/controller/TransformationsValidityChecker";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        coursesDiff: "./test/data/courses.zip",
        someInvalidCourses: "./test/data/someInvalidCourses.zip",
        noValidCourses: "./test/data/noValidCourses.zip",
        layer: "./test/data/layer.zip",
        notCourses: "./test/data/notCourses.zip",
        rooms: "./test/data/rooms.zip",
        noIndexHTM: "./test/data/noIndexHTM.zip",
        noRoomsFolder: "./test/data/noRoomsFolder.zip",
        missingRoomLinks: "./test/data/missingRoomLinks.zip",
        geoDataError: "./test/data/geoDataError.zip",
        noValidRooms: "./test/data/noValidRooms.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs
                .readFileSync(datasetsToLoad[id])
                .toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // Valid ID with whitespace, but includes other characters
    it("Should add a valid dataset with whitespace in the ID", function () {
        const id: string = " courses tests ";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // Invalid content with courses hidden under 1 more layer in the folder
    it("Should throw an error where the course folder is not in the top level", function () {
        const id: string = "layer";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // Adding course datasets that includes an invalid dataset file within
    it("Should add a valid dataset despite some invalid files in zip", function () {
        const id: string = "someInvalidCourses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    //  Valid DatasetKind Room
    it("Should add a valid Rooms Dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // Adding multiple datasets to InsightUBC
    it("Should add multiple valid datasets", function () {
        const id: string = "courses";
        const id2: string = "coursesDiff";
        const expected: string[] = [id, id2];
        let dataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 0};
        let dataset2: InsightDataset = {id: id2, kind: InsightDatasetKind.Courses, numRows: 0};
        const futureResult: Promise<string[]> = Helper.addTwoDatasets(datasets, insightFacade, dataset, dataset2);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    //  Should return an error since there were no valid courses in the dataset
    it("Should return an error due to no valid courses in the dataset", function () {
        const id: string = "noValidCourses";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    //  Should return an error since there were no valid rooms in the dataset
    it("Should return an error due to no valid rooms in the dataset", function () {
        const id: string = "noValidRooms";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    //  ID Error having Underscore
    it("Should fail due to underscore in the id", function () {
        const id: string = "courses_";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    //  ID Error having only an Underscore
    it("Should fail due to having only an underscore in the id", function () {
        const id: string = "_";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // ID Error having only whitespace in the id
    it("Should fail due only whitespace in the id", function () {
        const id: string = "       ";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // Invalid empty string ID
    it("Should fail being an empty string", function () {
        const id: string = "";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets["courses"],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // Invalid content as it is not a serialized zip
    it("Should fail by not having proper content folder courses", function () {
        const id: string = "notCourses";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // Invalid content that does not exist
    it("Should fail by not folder found", function () {
        const id: string = "nonExist";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // ID Error with identical id already found in the dataset
    it("Should reject since this is a repeated id", function () {
        const id: string = "courses";
        let dataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 0};
        let futureResult = Helper.addTwoDatasets(datasets, insightFacade, dataset, dataset);
        return expect(futureResult).rejectedWith(InsightError);
    });

    // ID Error with different ID using different DatasetKind
    it("Should reject since this is a repeated id despite different DatasetKind", function () {
        const id: string = "courses";
        let dataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 0};
        let dataset2: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows: 0};
        let futureResult = Helper.addTwoDatasets(datasets, insightFacade, dataset, dataset2);
        return expect(futureResult).rejectedWith(InsightError);
    });

    // Error when trying add Room Data with no rooms folder
    it("Should reject since there is no rooms folder", function () {
        const id: string = "noRoomsFolder";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // Error when trying add Room Data with no Index.htm
    it("Should reject since there is no Index.htm", function () {
        const id: string = "noIndexHTM";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // When links from Index.htm don't lead to files, should ignore and not throw an error
    it("Should ignore missing files from room links in Index.htm", function () {
        const id: string = "missingRoomLinks";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // Should skip over Geo Data when an error is returned with the API
    it("Should ignore error returned from Geo Data and skip", function () {
        const id: string = "geoDataError";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // Adding a non-zip file as content
    it("Should reject since content is not a zip file", function () {
        const id: string = "notAZip";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    // ID Error no dataset with name id
    it("Should fail due no dataset with id", function () {
        const id: string = "courses";
        const wrongId: string = "burger";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[wrongId],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).rejectedWith(InsightError);
    });

    it("Should remove a valid dataset", function () {
        const id: string = "courses";
        let dataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 0};
        let futureResult = Helper.addRemoveDatasets(datasets, insightFacade, dataset, dataset);
        return expect(futureResult).to.eventually.deep.equal(id);
    });

    it("Should remove a valid dataset of different type", function () {
        const id: string = "rooms";
        let dataset: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows: 0};
        let futureResult = Helper.addRemoveDatasets(datasets, insightFacade, dataset, dataset);
        return expect(futureResult).to.eventually.deep.equal(id);
    });

    it("Should throw NotfoundError from id dataset not found", function () {
        const id: string = "courses";
        const wrongID: string = "course";
        let dataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: 0};
        let dataset2: InsightDataset = {id: wrongID, kind: InsightDatasetKind.Courses, numRows: 0};
        let futureResult = Helper.addRemoveDatasets(datasets, insightFacade, dataset, dataset2);
        return expect(futureResult).rejectedWith(NotFoundError);
    });

    it("Should throw InsightError from an incorrect id using underscore", function () {
        const id: string = "courses_";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).rejectedWith(InsightError);
    });

    it("Should throw InsightError from an incorrect id with only whitespace", function () {
        const id: string = "     ";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).rejectedWith(InsightError);
    });

    it("Should throw InsightError from an incorrect id with only an underscore", function () {
        const id: string = "_";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).rejectedWith(InsightError);
    });

    it("Should throw InsightError from an incorrect id with empty string", function () {
        const id: string = "";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).rejectedWith(InsightError);
    });

    it("Should throw NotFoundError from dataset being removed twice", function () {
        const id: string = "courses";
        const myDataset: InsightDataset = {
            id: id,
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        let futureResult = Helper.addDatasetAndRemoveTwice(datasets, insightFacade, myDataset, myDataset, myDataset);
        return expect(futureResult).rejectedWith(NotFoundError);
    });

    it("Should return an empty InsightUBC", function () {
        const expected: InsightDataset[] = [];
        const futureResult: Promise<
            InsightDataset[]
        > = insightFacade.listDatasets();
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should return a single data in InsightUBC", function () {
        const id: string = "courses";
        const myDataset: InsightDataset = {
            id: id,
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const expected: InsightDataset[] = [myDataset];
        let futureResult = Helper.addDatasetAndListDataset(datasets, insightFacade, myDataset);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should return a single Rooms InsightDataset in InsightUBC", function () {
        const id: string = "rooms";
        const myDataset: InsightDataset = {
            id: id,
            kind: InsightDatasetKind.Rooms,
            numRows: 364,
        };
        const expected: InsightDataset[] = [myDataset];
        let futureResult = Helper.addDatasetAndListDataset(datasets, insightFacade, myDataset);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should return a multiple datasets in InsightUBC", function () {
        const id: string = "courses";
        const myDataset: InsightDataset = {
            id: id,
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const myDataset2: InsightDataset = {
            id: "coursesDiff",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const expected: InsightDataset[] = [myDataset, myDataset2];
        let futureResult = Helper.addTwoDatasetsAndListDatasets(datasets, insightFacade, myDataset, myDataset2);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should return one Courses Dataset and one Rooms Dataset in InsightUBC", function () {
        const courses: string = "courses";
        const rooms: string = "rooms";
        const myDataset: InsightDataset = {
            id: courses,
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const myDataset2: InsightDataset = {
            id: rooms,
            kind: InsightDatasetKind.Rooms,
            numRows: 364,
        };
        const expected: InsightDataset[] = [myDataset, myDataset2];
        let futureResult = Helper.addTwoDatasetsAndListDatasets(datasets, insightFacade, myDataset, myDataset2);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should return a single dataset after removing another one in InsightUBC", function () {
        const id: string = "courses";
        const myDataset: InsightDataset = {
            id: id,
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const myDataset2: InsightDataset = {
            id: "coursesDiff",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const expected: InsightDataset[] = [myDataset2];
        let futureResult =
            Helper.addTwoDatasetsRemoveOneThenList(datasets, insightFacade, myDataset, myDataset2, myDataset);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const cacheDir = __dirname + "/../data";
    const datasetsToQuery: {
        [id: string]: { path: string; kind: InsightDatasetKind };
    } = {
        courses: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
        rooms: {
            path: "./test/data/rooms.zip",
            kind: InsightDatasetKind.Rooms
        }
    };
    let insightFacade: InsightFacade;
    let queryValidator: QueryValidator;
    let sectionValidator: SectionValidator;
    let transformationsValidityChecker: TransformationsValidityChecker;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${err}`,
            );
        }
        // TODO: My input:
        queryValidator = new QueryValidator(["courses", "rooms"]);
        sectionValidator = new SectionValidator();
        transformationsValidityChecker = new TransformationsValidityChecker(["courses", "rooms"]);
        // end of my input

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(
                insightFacade.addDataset(id, data, ds.kind),
            );
        }
        return Helper.allPromisesFulfilled(loadDatasetPromises);
        // return Promise.all(loadDatasetPromises);
        // return Promise.all(loadDatasetPromises).catch((err) => {
        //     /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
        //      * for the purposes of seeing all your tests run.
        //      * TODO For C1, remove this catch block (but keep the Promise.all)
        //      */
        //     return Promise.resolve("HACK TO LET QUERIES RUN");
        // });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
        // try {
        //     fs.removeSync(cacheDir);
        //     fs.mkdirSync(cacheDir);
        //     insightFacade = new InsightFacade();
        // } catch (err) {
        //     Log.error(err);
        // }
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        return Helper.performTestQuery(testQueries, insightFacade);
        // describe("Dynamic InsightFacade PerformQuery tests", function () {
        //     for (const test of testQueries) {
        //         it(`[${test.filename}] ${test.title}`, function () {
        //             const futureResult: Promise<
        //                 any[]
        //             > = insightFacade.performQuery(test.query);
        //             return TestUtil.verifyQueryResult(futureResult, test);
        //         });
        //     }
        // });
    });

    it("isSComparisonValid - valid", () => {
        const validSComparisonQuery = {
            IS: {
                courses_dept: "*pizza*",
            },
        };
        let nestedType: string = Object.prototype.toString.call(
            validSComparisonQuery.IS,
        );

        assert.isTrue(
            queryValidator.isSComparisonValid(validSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: invalid key in IS", () => {
        const invalidSComparisonQuery = {
            IS: {
                IS: {
                    courses_dept: "a",
                },
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: multiple keys", () => {
        const invalidSComparisonQuery = {
            IS: {
                courses_dept: "cpsc",
                courses_instructor: "pizza",
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: referenced dataSet is empty string", () => {
        const invalidSComparisonQuery = {
            IS: {
                _dept: "cpsc",
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: referenced dataSet not added yet", () => {
        const invalidSComparisonQuery = {
            IS: {
                notaddedyet_dept: "cpsc",
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: asterisks in middle of string", () => {
        const invalidSComparisonQuery = {
            IS: {
                courses_dept: "cp*sc",
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: contains non-object", () => {
        const emptyArray: any[][] = [[]];
        const invalidSComparisonQuery = {
            IS: emptyArray,
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: invalid value type in IS", () => {
        const emptyArray: any[] = [];
        const invalidSComparisonQuery = {
            IS: {
                courses_dept: emptyArray,
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: wrong data type", () => {
        const invalidSComparisonQuery = {
            IS: {
                courses_dept: 1,
            },
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: no key in IS", () => {
        const invalidSComparisonQuery = {
            IS: {},
        };
        assert.isFalse(
            queryValidator.isSComparisonValid(invalidSComparisonQuery, []),
        );
    });

    it("isMComparisonValid - valid", () => {
        const validMComparisonQuery = {
            GT: {
                courses_pass: 1500,
            },
        };
        assert.isTrue(
            queryValidator.isMComparisonValid(validMComparisonQuery, []),
        );
    });

    it("isMComparisonValid - invalid: invalid key in EQ", () => {
        const invalidMComparisonQuery = {
            EQ: {
                LT: {
                    courses_pass: 2,
                },
            },
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isMComparisonValid - invalid: multiple keys", () => {
        const invalidMComparisonQuery = {
            LT: {
                courses_pass: 5,
                courses_fail: 50,
            },
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isMComparisonValid - invalid: referenced dataSet is empty string", () => {
        const invalidMComparisonQuery = {
            EQ: {
                _pass: 5,
            },
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isMComparisonValid - invalid: referenced dataSet not added yet", () => {
        const invalidMComparisonQuery = {
            LT: {
                notaddedyet_pass: 3,
            },
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isMComparisonValid - invalid: contains non-object", () => {
        const emptyArray: any[] = [];
        const invalidMComparisonQuery = {
            EQ: emptyArray,
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isMComparisonValid - invalid: no key in EQ", () => {
        const invalidMComparisonQuery = {
            EQ: {},
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isSComparisonValid - invalid: wrong data type", () => {
        const invalidMComparisonQuery = {
            GT: {
                courses_pass: "pizza",
            },
        };
        assert.isFalse(
            queryValidator.isMComparisonValid(invalidMComparisonQuery, []),
        );
    });

    it("isFilterValid - valid: complex filter", () => {
        const complexValidQuery = {
            OR: [
                {
                    AND: [
                        {
                            GT: {
                                courses_avg: 90,
                            },
                        },
                        {
                            IS: {
                                courses_dept: "adhe",
                            },
                        },
                        {
                            NOT: {
                                IS: {
                                    courses_dept: "*ps*",
                                },
                            },
                        },
                    ],
                },
                {
                    EQ: {
                        courses_avg: 95,
                    },
                },
            ],
        };

        assert.isTrue(queryValidator.isFilterValid(complexValidQuery, []));
    });

    it("isFilterValid - invalid: empty AND array", () => {
        const emptyArray: any[] = [];
        const invalidFilter = {
            AND: emptyArray,
        };

        assert.isFalse(queryValidator.isFilterValid(invalidFilter, []));
    });

    it("isFilterValid - invalid: AND empty object", () => {
        const invalidFilter = {
            AND: {},
        };

        assert.isFalse(queryValidator.isFilterValid(invalidFilter, []));
    });

    it("isFilterValid - invalid: empty OR array", () => {
        const emptyArray: any[] = [];
        const invalidFilter = {
            OR: emptyArray,
        };

        assert.isFalse(queryValidator.isFilterValid(invalidFilter, []));
    });

    it("isFilterValid - invalid: OR has two keys", () => {
        const filterInvalid = {
            OR: [
                {
                    LT: {
                        courses_avg: 70,
                    },
                    GT: {
                        courses_avg: 60,
                    },
                },
            ],
        };
        assert.isFalse(queryValidator.isFilterValid(filterInvalid, []));
    });

    it("isFilterValid - invalid: invalid filter key", () => {
        const invalidFilter = {
            BT: {
                courses_avg: 97,
            },
        };

        assert.isFalse(queryValidator.isFilterValid(invalidFilter, []));
    });

    it("isFilterValid - invalid: 0 keys in AND array", () => {
        const invalidFilter = {
            AND: [{}],
        };

        assert.isFalse(queryValidator.isFilterValid(invalidFilter, []));
    });

    it("isFilterValid - invalid: 0 keys in OR array", () => {
        const invalidFilter = {
            OR: [{}],
        };

        assert.isFalse(queryValidator.isFilterValid(invalidFilter, []));
    });

    it("isOptionsValid - valid: duplicated column", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const validOptions = {
            COLUMNS: ["courses_dept", "courses_dept"],
            ORDER: "courses_dept"
        };

        assert.isTrue(queryValidator.isOptionsValid(validOptions, datasetsSeen, groupKeys, applyKeys));
        Log.trace(datasetsSeen);
    });

    it("isOptionsValid - invalid: Cannot read property 'GROUP' of undefined", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];
        const invalidOptions = {
            COLUMNS: ["courses"],
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: COLUMNS is empty", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const emptyArray: any[] = [];
        const invalidOptions = {
            COLUMNS: emptyArray,
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid COLUMN key", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];
        const invalidOptions = {
            COLUMNS: ["courses_best"],
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid key in OPTIONS", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: ["courses_avg"],
            TANNER: {},
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid type in OPTIONS", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: [8],
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid type of COLUMN key not immediate", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: ["courses_dept", 8],
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid type in ORDER", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: ["courses_dept"],
            ORDER: 8,
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: missing COLUMNS", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {};

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER not in columns", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: ["courses_dept"],
            ORDER: "courses_avg",
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: OPTIONS wrong type", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: ["courses_dept"],
            ORDER: 23,
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: dataset not added", () => {
        const groupKeys: string[] = [];
        const applyKeys: string[] = [];
        const datasetsSeen: string[] = [];

        const invalidOptions = {
            COLUMNS: ["squidward_dept"],
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER is not an object", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const emptyArray: any[] = [];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: emptyArray
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid ORDER direction type", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: 1,
                keys: ["maxSeats"]
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER key not in columns", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats", "rooms_fullname"]
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: invalid ORDER direction", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "LEFT",
                keys: ["maxSeats"]
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER object missing dir key", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                keys: ["maxSeats"]
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER object missing keys key", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN"
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER object extra key", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "LEFT",
                keys: ["maxSeats"],
                extraKey: "error"
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER object keys is not array", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: 1
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: ORDER object keys is empty", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const emptyArray: any[] = [];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: emptyArray
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: key in COLUMNS not in GROUP or APPLY", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats", "rooms_fullname"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats"]
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - invalid: all ORDER keys must be in columns", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const invalidOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats", "rooms_fullname"]
            }
        };

        assert.isFalse(queryValidator.isOptionsValid(invalidOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - valid: base example", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const validOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats"]
            }
        };

        assert.isTrue(queryValidator.isOptionsValid(validOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - valid: multiple keys in order", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const validOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats", "rooms_shortname"]
            }
        };

        assert.isTrue(queryValidator.isOptionsValid(validOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - valid: apply contains an additional key that is not used", () => {
        const groupKeys: string[] = ["rooms_shortname"];
        const applyKeys: string[] = ["maxSeats", "additionalKeyNotUsed"];
        const datasetsSeen: string[] = ["rooms"];
        const validOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats", "rooms_shortname"]
            }
        };

        assert.isTrue(queryValidator.isOptionsValid(validOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isOptionsValid - valid: group contains an additional key that is not used", () => {
        const groupKeys: string[] = ["rooms_shortname", "additionalKeyNotUsed"];
        const applyKeys: string[] = ["maxSeats"];
        const datasetsSeen: string[] = ["rooms"];
        const validOptions = {
            COLUMNS: ["rooms_shortname", "maxSeats"],
            ORDER: {
                dir: "DOWN",
                keys: ["maxSeats", "rooms_shortname"]
            }
        };

        assert.isTrue(queryValidator.isOptionsValid(validOptions, datasetsSeen, groupKeys, applyKeys));
    });

    it("isTransformationsValid - invalid: missing apply", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: missing group", () => {
        const invalidTransformations = {
           APPLY: [{
               maxSeats: {
                   MAX: "rooms_seats"
                }
           }]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: extra key in TRANSFORMATIONS", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [{
               maxSeats: {
                   MAX: "rooms_seats"
                }
           }],
           EXTRA: {}
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: invalid operator in APPLY", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [{
               maxSeats: {
                   POTATO: "rooms_seats"
                }
           }]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys
        ));
    });

    it("isTransformationsValid - invalid: invalid apply rule key target", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [{
               maxSeats: {
                   MAX: 1
                }
           }]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: apply not an array", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: 1
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: apply has more than 1 key", () => {
        const invalidTransformations = {
           GROUP: ["courses_id"],
           APPLY: [
               {
                   overallAvg: {
                       AVG: "courses_avg"
                   },
                   extraKey: {
                       MAX: "courses_avg"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: apply has no keys", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [{}]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: apply rule is not an object", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [
               1
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: invalid key type in AVG", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [
               {
                   overallAvg: {
                       AVG: "rooms_fullname"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: non-string entries within group array", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname", 1, 2],
           APPLY: [
               {
                   overallAvg: {
                       AVG: "courses_avg"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: invalid key in group", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname", "rooms_tomato"],
           APPLY: [
               {
                   seatsAvg: {
                       AVG: "rooms_seats"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: group not array", () => {
        const invalidTransformations = {
           GROUP: 1,
           APPLY: [
               {
                   seatsAvg: {
                       AVG: "rooms_seats"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: group empty array", () => {
        const emptyArray: any[] = [];

        const invalidTransformations = {
           GROUP: emptyArray,
           APPLY: [
               {
                   seatsAvg: {
                       AVG: "rooms_seats"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - invalid: group contains an apply key", () => {
        const invalidTransformations = {
           GROUP: ["rooms_shortname", "seatsAvg"],
           APPLY: [
               {
                   seatsAvg: {
                       AVG: "rooms_seats"
                   }
               }
           ]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isTransformationsValid(
            invalidTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys)
        );
    });

    it("isTransformationsValid - valid", () => {
        const validTransformations = {
           GROUP: ["rooms_shortname"],
           APPLY: [{
               maxSeats: {
                   MAX: "rooms_seats"
                }
           }]
        };

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];

        assert.isTrue(transformationsValidityChecker.isTransformationsValid(
            validTransformations, uniqueDatasetIDStrings, groupKeys, applyKeys
        ));
        assert.isTrue(uniqueDatasetIDStrings.includes("rooms"));
        assert.isTrue(uniqueDatasetIDStrings.length === 1);

        assert.isTrue(groupKeys.includes("rooms_shortname"));
        assert.isTrue(groupKeys.length === 1);

        assert.isTrue(applyKeys.includes("maxSeats"));
        assert.isTrue(applyKeys.length === 1);

    });


    it("isGroupValid - invalid: non-string entries within group array", () => {
        const invalidGroup = ["rooms_shortname", 1, 2];

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isGroupValid(
            invalidGroup, uniqueDatasetIDStrings, groupKeys)
        );
    });

    it("isGroupValid - invalid: invalid key in group", () => {
        const invalidGroup = ["rooms_shortname", "rooms_tomato"];

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isGroupValid(
            invalidGroup, uniqueDatasetIDStrings, groupKeys)
        );
    });

    it("isGroupValid - invalid: group not array", () => {
        const invalidGroup = 1;

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isGroupValid(
            invalidGroup, uniqueDatasetIDStrings, groupKeys)
        );
    });

    it("isTransformationsValid - invalid: group empty array", () => {
        const invalidGroup: any[] = [];

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isGroupValid(
            invalidGroup, uniqueDatasetIDStrings, groupKeys)
        );
    });

    it("isGroupValid - invalid: group contains an apply key", () => {
        const invalidGroup = ["rooms_shortname", "seatsAvg"];

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isGroupValid(
            invalidGroup, uniqueDatasetIDStrings, groupKeys)
        );
    });

    it("isGroupValid - valid", () => {
        const validGroup = ["rooms_shortname", "rooms_fullname"];

        let uniqueDatasetIDStrings: string[] = [];
        let groupKeys: string[] = [];

        assert.isTrue(transformationsValidityChecker.isGroupValid(
            validGroup, uniqueDatasetIDStrings, groupKeys)
        );

        assert.isTrue(uniqueDatasetIDStrings.includes("rooms"));
        assert.isTrue(uniqueDatasetIDStrings.length === 1);

        assert.isTrue(groupKeys.includes("rooms_shortname"));
        assert.isTrue(groupKeys.includes("rooms_fullname"));
        assert.isTrue(groupKeys.length === 2);
    });

    // TODO: Start of Apply Tests

    it("isApplyValid - invalid: invalid operator in APPLY", () => {
        const invalidApply = [
            {
                maxSeats: {
                    POTATO: "rooms_seats"
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: invalid apply rule key target", () => {
        const invalidApply = [
            {
                maxSeats: {
                    MAX: 1
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: apply not an array", () => {
        const invalidApply = 1;

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: apply has more than 1 key", () => {
        const invalidApply = [
            {
                overallAvg: {
                    AVG: "courses_avg"
                },
                extraKey: {
                    MAX: "courses_avg"
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: applyrule has no applykey", () => {
        const invalidApply = [
            {}
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: apply rule is not an object", () => {
        const invalidApply = [
            1
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: invalid key type in AVG", () => {
        const invalidApply = [
            {
                overallAvg: {
                    AVG: "rooms_fullname"
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: apply body has no keys", () => {
        const invalidApply = [
            {
                overallAvg: {
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: apply body has two keys", () => {
        const invalidApply = [
            {
                overallAvg: {
                    AVG: "courses_avg",
                    MAX: "courses_avg"
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: invalid key type in average", () => {
        const invalidApply = [
            {
                overallAvg: {
                    AVG: "courses_title"
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - invalid: invalid key type in AVG", () => {
        const invalidApply = [
            {
                overallAvg: {
                    AVG: "rooms_fullname"
                }
            }
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isFalse(transformationsValidityChecker.isApplyValid(
            invalidApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - valid: empty array", () => {
        const validApply: any[] = [];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isTrue(transformationsValidityChecker.isApplyValid(
            validApply, uniqueDatasetIDStrings, applyKeys
        ));
    });

    it("isApplyValid - valid", () => {
        const validApply = [
            {overallMinAvg: {MIN: "courses_avg"}},
            {overallMaxPass: {MAX: "courses_pass"}},
            {overallCountPass: {COUNT: "courses_title"}},
            {overallSumFail: {SUM: "courses_fail"}},
            {overallAvgAudit: {AVG: "courses_audit"}}
        ];

        let uniqueDatasetIDStrings: string[] = [];
        let applyKeys: string[] = [];

        assert.isTrue(transformationsValidityChecker.isApplyValid(
            validApply, uniqueDatasetIDStrings, applyKeys
        ));

        assert.isTrue(uniqueDatasetIDStrings.includes("courses"));
        assert.isTrue(uniqueDatasetIDStrings.length === 1);

        assert.isTrue(applyKeys.includes("overallMinAvg"));
        assert.isTrue(applyKeys.includes("overallMaxPass"));
        assert.isTrue(applyKeys.includes("overallCountPass"));
        assert.isTrue(applyKeys.includes("overallSumFail"));
        assert.isTrue(applyKeys.includes("overallAvgAudit"));

        assert.isTrue(applyKeys.length === 5);
    });

    it("isQueryValid - valid: All columns", () => {
        const queryValid = {
            WHERE: {},
            OPTIONS: {
                COLUMNS: ["courses_dept"],
            },
        };
        assert.isTrue(queryValidator.isQueryValid(queryValid));
    });

    it("isQueryValid - valid: complicated", () => {
        const filterValid = {
            OR: [
                {
                    AND: [
                        {
                            GT: {
                                courses_avg: 90,
                            },
                        },
                        {
                            IS: {
                                courses_dept: "adhe",
                            },
                        },
                        {
                            NOT: {
                                IS: {
                                    courses_dept: "*ps*",
                                },
                            },
                        },
                    ],
                },
                {
                    EQ: {
                        courses_avg: 95,
                    },
                },
            ],
        };
        const optionsValid = {
            COLUMNS: ["courses_dept", "courses_avg", "courses_dept"],
            ORDER: "courses_avg",
        };
        const queryValid = {
            WHERE: filterValid,
            OPTIONS: optionsValid,
        };

        assert.isTrue(queryValidator.isQueryValid(queryValid));
    });

    it("isQueryValid - invalid: no WHERE clause", () => {
        const optionsValid = {
            COLUMNS: ["courses_dept", "courses_avg", "courses_dept"],
            ORDER: "courses_avg",
        };
        const queryInvalid = {
            OPTIONS: optionsValid,
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - invalid: no OPTIONS clause", () => {
        const queryInvalid = {
            WHERE: {},
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - invalid: WHERE clause valid; OPTIONS invalid", () => {
        const invalidOptions = {
            COLUMNS: ["courses_dept"],
            ORDER: 23,
        };
        const queryInvalid = {
            WHERE: {},
            OPTIONS: invalidOptions,
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - invalid: WHERE clause invalid; OPTIONS valid", () => {
        const whereClauseInvalid = {
            AND: [{}],
        };
        const optionsValid = {
            COLUMNS: ["courses_dept", "courses_dept"],
            ORDER: "courses_dept",
        };
        const queryInvalid = {
            WHERE: whereClauseInvalid,
            OPTIONS: optionsValid,
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - invalid: WHERE type not object", () => {
        let emptyArray: string[] = [];
        const queryInvalid = {
            WHERE: emptyArray,
            OPTIONS: {
                COLUMNS: ["courses_dept"],
                ORDER: "courses_dept",
            },
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - invalid: OPTIONS type not object", () => {
        let emptyArray: string[] = [];
        const queryInvalid = {
            WHERE: {
                IS: {
                    courses_dept: "cpsc",
                },
            },
            OPTIONS: emptyArray,
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - multiple datasets in just WHERE clause", () => {
        const queryInvalid = {
            WHERE: {
                AND: [
                    {
                        GT: {
                            courses_avg: 97,
                        },
                    },
                    {
                        LT: {
                            alternative_avg: 97,
                        },
                    },
                ],
            },
            OPTIONS: {
                COLUMNS: ["courses_avg"],
            },
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - multiple datasets in just OPTIONS clause", () => {
        const queryInvalid = {
            WHERE: {
                GT: {
                    courses_avg: 98,
                },
            },
            OPTIONS: {
                COLUMNS: ["courses_avg", "alternate_avg"],
            },
        };
        assert.isFalse(queryValidator.isQueryValid(queryInvalid));
    });

    it("isQueryValid - invalid query with TRANSFORMATIONS non-object", () => {
        const invalidQuery = {
            WHERE: {

            },
            OPTIONS: {
                COLUMNS: ["courses_avg"]
            },
            TRANSFORMATIONS: "pizza"
        };

        assert.isFalse(queryValidator.isQueryValid(invalidQuery));
    });

    it("isQueryValid - valid complex query with TRANSFORMATIONS", () => {
        const queryValid = {
            WHERE: {
                AND: [{
                   IS: {
                       rooms_furniture: "*Tables*"
                    }
                }, {
                    GT: {
                      rooms_seats: 300
                  }
               }]
           },
           OPTIONS: {
               COLUMNS: [
                   "rooms_shortname",
                   "maxSeats"
               ],
               ORDER: {
                   dir: "DOWN",
                   keys: ["maxSeats"]
               }
           },
           TRANSFORMATIONS: {
               GROUP: ["rooms_shortname"],
               APPLY: [{
                   maxSeats: {
                       MAX: "rooms_seats"
                   }
               }]
           }
        };

        assert.isTrue(queryValidator.isQueryValid(queryValid));
    });

    it("getRelevantColumns - with duplication", () => {
        const optionsObject = {
            COLUMNS: [
                "courses_dept",
                "courses_avg",
                "courses_pass",
                "courses_avg",
                "courses_fail",
                "courses_fail",
            ],
        };
        const expectedResult = [
            "courses_dept",
            "courses_avg",
            "courses_pass",
            "courses_fail",
        ];
        for (const identifier of expectedResult) {
            assert.include(
                insightFacade.getRelevantColumns(optionsObject),
                identifier,
            );
        }
        assert.equal(
            insightFacade.getRelevantColumns(optionsObject).length,
            expectedResult.length,
        );
    });

    it("sectionValidator - true with sectionObject1", () => {
        const sectionDataObject = {
            Audit: 0,
            Avg: 97.09,
            Subject: "epsc",
            Fail: 0,
            Course: "596",
            Professor: "kishor, nand",
            Pass: 11,
            Title: "cor des ed res",
            id: "86962",
            Year: 2007,
        };

        const whereQuery = {
            AND: [
                {
                    EQ: {
                        courses_year: 2007,
                    },
                },
                {
                    GT: {
                        courses_avg: 97,
                    },
                },
            ],
        };

        assert.isTrue(
            sectionValidator.isSectionValid(whereQuery, sectionDataObject),
        );
    });

    it("sectionValidator - true with sectionObject", () => {
        const sectionDataObject = {
            Audit: 0,
            Avg: 97.09,
            Subject: "epsc",
            Fail: 0,
            Course: "596",
            Professor: "kishor, nand",
            Pass: 11,
            Title: "cor des ed res",
            id: "86962",
            Year: 2007,
        };

        const whereQuery = {
            AND: [
                {
                    EQ: {
                        courses_year: 2007,
                    },
                },
                {
                    GT: {
                        courses_avg: 97,
                    },
                },
            ],
        };

        assert.isTrue(
            sectionValidator.isSectionValid(whereQuery, sectionDataObject),
        );
    });

    it("sectionValidator - true with string statements", () => {
        const sectionDataObject = {
            Audit: 0,
            Avg: 97.09,
            Subject: "epsc",
            Fail: 0,
            Course: "596",
            Professor: "kishor, nand",
            Pass: 11,
            Title: "cor des ed res",
            id: "86962",
            Year: 2007,
        };

        const whereQuery = {
            AND: [
                {
                    IS: {
                        courses_dept: "*ps*",
                    },
                },
                {
                    IS: {
                        courses_title: "*res",
                    },
                },
                {
                    IS: {
                        courses_uuid: "8696*",
                    },
                },
                {
                    IS: {
                        courses_id: "596",
                    },
                },
            ],
        };

        assert.isTrue(
            sectionValidator.isSectionValid(whereQuery, sectionDataObject),
        );
    });
});
