import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError,
} from "./IInsightFacade";
import * as fs from "fs-extra";
import CourseZipParser from "./CourseZipParser";
import RoomZipParser from "./RoomZipParser";

import QueryValidator from "./QueryValidator";
import SectionValidator from "./SectionValidator";
import CourseSorter from "./CourseSorter";
import DataTranslator from "./DataTranslator";
import FilePathReader from "./FilePathReader";
import ObjectConverter from "./ObjectConverter";
import CourseFilter from "./CourseFilter";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
    private datasets: InsightDataset[];
    private cacheDir = __dirname + "/../../data/";
    private coursesCacheDir = __dirname + "/../../data/courses/";
    private roomsCacheDir = __dirname + "/../../data/rooms/";

    constructor() {
        if (!fs.existsSync(this.coursesCacheDir)) {
            fs.mkdirsSync(this.coursesCacheDir);
        }
        if (!fs.existsSync(this.roomsCacheDir)) {
            fs.mkdirsSync(this.roomsCacheDir);
        }
        this.datasets  = this.getDataOnDisk();
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<string[]> {
        if (this.checkUniqueID(id) && this.checkValidID(id)) {
            if (kind === InsightDatasetKind.Courses) {
                let courseZipParser: CourseZipParser = new CourseZipParser();
                return courseZipParser
                    .addCourseKindDataset(id, content)
                    .then(() => {
                        this.datasets.push(courseZipParser.countCourseRows(id));
                        return Promise.resolve(
                            this.getAllDatasetIDs(this.datasets),
                        );
                    })
                    .catch(() => {
                        return Promise.reject(new InsightError("Error adding dataset"));
                    });
            } else if (kind === InsightDatasetKind.Rooms) {
                let roomZipParser: RoomZipParser = new RoomZipParser();
                return roomZipParser
                    .addRoomKindDataset(id, content)
                    .then(() => {
                        this.datasets.push(roomZipParser.countRoomRows(id));
                        return Promise.resolve(
                            this.getAllDatasetIDs(this.datasets),
                        );
                    })
                    .catch(() => {
                        return Promise.reject(new InsightError("Error adding dataset"));
                    });
            } else {
                return Promise.reject(new InsightError("Invalid Kind"));
            }
        } else {
            return Promise.reject(new InsightError("Invalid ID"));
        }
    }

    public removeDataset(id: string): Promise<string> {
        if (this.checkValidID(id)) {
            if (fs.existsSync(this.coursesCacheDir + id)) {
                fs.removeSync(this.coursesCacheDir + id);
                this.datasets = this.datasets.filter((item) => {
                    return item.id !== id;
                });
                return Promise.resolve(id);
            } else if (fs.existsSync(this.roomsCacheDir + id)) {
                fs.removeSync(this.roomsCacheDir + id);
                this.datasets = this.datasets.filter((item) => {
                    return item.id !== id;
                });
                return Promise.resolve(id);
            } else {
                return Promise.reject(new NotFoundError("ID not found"));
            }
        } else {
            return Promise.reject(new InsightError("Invalid ID"));
        }
    }

    // Helper function to check whether the id string is valid: Not empty or contains an underscore
    private checkValidID(id: string): boolean {
        return !(id === null || id.includes("_") || id.match(/^ *$/) !== null);
    }

    // Helper function to get all data saved on disk
    private getDataOnDisk(): InsightDataset[] {
        let datasets: InsightDataset[] = [];
        let courseZipParser = new CourseZipParser();
        let roomsZipParser = new RoomZipParser();
        fs.readdirSync(this.coursesCacheDir).forEach((folder) => {
            datasets.push(courseZipParser.countCourseRows(folder));
        });
        fs.readdirSync(this.roomsCacheDir).forEach((folder) => {
            datasets.push(roomsZipParser.countRoomRows(folder));
        });
        return datasets;
    }

    // Helper function to check if the id already exists
    private checkUniqueID(id: string): boolean {
        return !this.getAllDatasetIDs(this.datasets).includes(id);
    }

    // Helper function that gets all the IDs in the InsightDataset
    private getAllDatasetIDs(datasets: InsightDataset[]): string[] {
        let datasetIDs: string[] = [];
        for (let insight of datasets) {
            datasetIDs.push(insight.id);
        }
        return datasetIDs;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.datasets);
    }

    public performQuery(query: any): Promise<any[]> {
        let queryValidator: QueryValidator = new QueryValidator(
            this.getAllDatasetIDs(this.datasets),
        );
        if (!queryValidator.isQueryValid(query)) {
            return Promise.reject(new InsightError("Invalid Query"));
        }

        let relevantColumns: string[] = this.getRelevantColumns(query.OPTIONS);
        let coursesMeetingCondition: any[];
        if (Object.keys(query).includes("TRANSFORMATIONS")) {
            coursesMeetingCondition = this.getCoursesMeetingCondition(query.WHERE, relevantColumns,
                query.TRANSFORMATIONS
            );
        } else {
            coursesMeetingCondition = this.getCoursesMeetingCondition(query.WHERE, relevantColumns, null);
        }

        if (coursesMeetingCondition.length > 5000) {
            return Promise.reject(new ResultTooLargeError("Result too large"));
        }

        let filteredCourses: any[];
        let courseFilter: CourseFilter = new CourseFilter();
        // if (Object.keys(query).includes("TRANSFORMATIONS")) {
        //     filteredCourses = this.filterCoursesWithTransformations(coursesMeetingCondition, query.TRANSFORMATIONS,
        //                                                             query.OPTIONS.COLUMNS);
        // } else {
        //     filteredCourses = this.filterForRelevantColumns(coursesMeetingCondition, relevantColumns);
        // }

        if (Object.keys(query).includes("TRANSFORMATIONS")) {
            filteredCourses = courseFilter.filterCoursesWithTransformations(coursesMeetingCondition,
                                                                            query.TRANSFORMATIONS,
                                                                            query.OPTIONS.COLUMNS);
        } else {
            filteredCourses = courseFilter.filterForRelevantColumns(coursesMeetingCondition, relevantColumns);
        }

        if (Object.keys(query.OPTIONS).includes("ORDER")) {
            let courseSorter: CourseSorter = new CourseSorter();
            courseSorter.sortCourses(filteredCourses, query.OPTIONS.ORDER);
        }
        return Promise.resolve(filteredCourses);
    }

    // Everything below this will eventually be private; is public for testing purposes exclusively

    public getRelevantColumns(query: any): string[] {
        let columnsArray: string[] = query["COLUMNS"];
        return [...new Set(columnsArray)];
    }

    public filterForRelevantColumns(relevantCourses: any[], relevantColumns: string[]): any[] {
        let filteredCourses: any[] = [];
        let dataTranslator: DataTranslator = new DataTranslator();
        for (const course of relevantCourses) {
            let courseObjectToAdd: { [key: string]: any } = {};
            for (const column of relevantColumns) {
                let splitColumn = column.split("_");
                let identifier: string;
                if (splitColumn.length === 1) {
                    identifier = column;
                } else {
                    identifier = splitColumn[1];
                }
                courseObjectToAdd[column] =
                    course[
                        dataTranslator.translateToDataStandard(
                            identifier,
                        )
                    ];
            }
            filteredCourses.push(courseObjectToAdd);
        }
        return filteredCourses;
    }

    public getCoursesMeetingCondition(whereQuery: any, relevantColumns: string[], transformations: any): any[] {
        let datasetIDCurrent = this.getDatasetID(relevantColumns, transformations);
        let coursesMeetingCondition: any[] = [];
        let sectionValidator: SectionValidator = new SectionValidator();
        let objectConverter: ObjectConverter = new ObjectConverter();
        let pathToRequiredCoursesDataZipFile: string;
        if (datasetIDCurrent === "rooms") {
            pathToRequiredCoursesDataZipFile = this.roomsCacheDir + datasetIDCurrent;
        } else {
            pathToRequiredCoursesDataZipFile = this.coursesCacheDir + datasetIDCurrent;
        }
        let filePathReader: FilePathReader = new FilePathReader();
        let filePathsForCourses: string[] = filePathReader.readAllFiles(pathToRequiredCoursesDataZipFile);
        for (const filePath of filePathsForCourses) {
            let contentOfFile: Buffer = fs.readFileSync(filePath);
            if (datasetIDCurrent === "rooms") {
                let roomData: any;
                try {
                    roomData = JSON.parse(contentOfFile.toString());
                } catch (error) {
                    throw error;
                }
                if (sectionValidator.isSectionValid(whereQuery, roomData)) {
                    coursesMeetingCondition.push(roomData);
                    if (coursesMeetingCondition.length > 5000) {
                        return coursesMeetingCondition;
                    }
                }
            } else {
                let courseData: any[];
                try {
                    courseData = JSON.parse(contentOfFile.toString());
                } catch (error) {
                    throw error;
                }

                for (let sectionDataObject of courseData) {
                    objectConverter.convertObject(sectionDataObject);
                    if (sectionValidator.isSectionValid(whereQuery, sectionDataObject)) {
                        coursesMeetingCondition.push(sectionDataObject);
                    }

                    if (coursesMeetingCondition.length > 5000) {
                        return coursesMeetingCondition;
                    }
                }
            }
        }
        return coursesMeetingCondition;
    }

    private getDatasetID(relevantColumns: string[], transformations: any): string {
        let datasetID: string;
        if (transformations === null) {
            datasetID = relevantColumns[0].split("_")[0];
        } else {
            datasetID = transformations["GROUP"][0].split("_")[0];
        }
        return datasetID;
    }
}
