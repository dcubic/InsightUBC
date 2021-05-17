import {
    InsightDataset,
    InsightDatasetKind,
    InsightError,
} from "./IInsightFacade";
import * as JSZip from "jszip";
import { JSZipObject } from "jszip";
import * as fs from "fs-extra";
import Log from "../Util";

// JSON keys we have stored to the valid key mappings
export enum courseENUM {
    Title = "title",
    Course = "id",
    Professor = "instructor",
    Year = "year",
    Subject = "dept",
    id = "uuid",
    Audit = "audit",
    Avg = "avg",
    Pass = "pass",
    Fail = "fail",
}

export default class CourseZipParser {
    private courseCacheDir = __dirname + "/../../data/courses/";

    // handles all the functions involved in chaining the promises and filtering the base 64 content before saving it
    public addCourseKindDataset(id: string, content: string): Promise<any> {
        let promises = Array<Promise<any>>();
        return JSZip.loadAsync(content, { base64: true })
            .then((zip) => {
                let path = this.courseCacheDir + id;
                if (CourseZipParser.checkContainsCoursesFolder(zip)) {
                    fs.mkdirSync(path);
                    this.createPromiseList(zip, promises, id);
                    return Promise.all(promises).then(() => {
                        if (fs.readdirSync(path).length !== 0) {
                            return Promise.resolve(id);
                        }
                        fs.rmdirSync(path);
                        return Promise.reject();
                    });
                }
                return Promise.reject(new InsightError());
            })
            .catch((error) => {
                Log.trace(error);
                fs.rmdirSync(this.courseCacheDir + id);
                return Promise.reject(new InsightError());
            });
    }

    // creates a promise array of all the promises needed to be fulfilled in a specific folder
    private createPromiseList(
        zip: JSZip,
        promises: Array<Promise<any>>,
        id: string,
    ): void {
        zip.folder("courses").forEach((courseNum, file) => {
            promises.push(this.courseFilter(id, zip, courseNum, file));
        });
    }

    // removes all JSON files that are empty, filters their keys to only contain those in courseENUM, and saves it into
    // the data directory within their id directory
    private courseFilter(
        id: string,
        zip: JSZip,
        courseNum: string,
        file: JSZipObject,
    ): Promise<any> {
        return zip
            .file(file.name)
            .async("string")
            .then((txt) => {
                let obj = JSON.parse(txt).result;
                // Checks to make sure that the results array in the JSON is not empty
                if (Object.keys(obj).length === 0) {
                    return Promise.resolve();
                }
                // For every entry in the result array of the JSON
                // Every entry is a javascript object if it exists in the array
                for (let entry of obj) {
                    // Iterates through the keys and removes those that won't be used
                    Object.keys(entry).map((key) => {
                        if (entry.Section === "overall") {
                            entry.Year = "1900";
                        }
                        if (!(key in courseENUM)) {
                            delete entry[key];
                        }
                    });
                }
                let path = this.courseCacheDir + id + "/" + courseNum + ".json";
                return fs.writeFileSync(path, JSON.stringify(obj));
            })
            .catch(() => {
                return Promise.resolve();
            });
    }

    // Helper function to check whether there is a courses folder in the base64 zip content
    private static checkContainsCoursesFolder(zip: JSZip): boolean {
        return zip.folder(/^courses\//).length > 0;
    }

    // Helper function to count the number of rows in a InsightDatasetKind.Courses
    public countCourseRows(id: string): InsightDataset {
        let path = this.courseCacheDir + id;
        let newDataset: InsightDataset = {
            id: id,
            kind: InsightDatasetKind.Courses,
            numRows: 0,
        };
        fs.readdirSync(path).forEach((file) => {
            let fileContent = fs.readFileSync(path + "/" + file).toString();
            let JSONObj = JSON.parse(fileContent);
            for (let JSON of JSONObj) {
                Object.keys(JSON).map((key) => {
                    if (key === "Title") {
                        newDataset.numRows += 1;
                    }
                });
            }
        });
        return newDataset;
    }
}
