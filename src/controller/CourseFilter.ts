import Decimal from "decimal.js";

import DataTranslator from "./DataTranslator";

export default class CourseFilter {
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

    public filterCoursesWithTransformations(coursesMeetingCondition: any[],
                                            transformations: any,
                                            columns: string[]): any[] {
        let helperObject: {[key: string]: any[]} = {};
        let that = this;
        let groupedObjects: any[] = coursesMeetingCondition.reduce(function (result: any[], entityCurrent: any) {
            let groupKey: string = that.createGroupKey(entityCurrent, transformations.GROUP);

            let helperObjectKeys: string[] = Object.keys(helperObject);
            if (!helperObjectKeys.includes(groupKey)) {
                helperObject[groupKey] = [];
                helperObject[groupKey].push(entityCurrent);
                result.push(helperObject[groupKey]);
            } else {
                helperObject[groupKey].push(entityCurrent);
            }

            return result;
        }, []);

        let groupCount: number = groupedObjects.length;
        let unFilteredCourses: any[] = [];
        for (let group = 0; group < groupCount; group++) {
            this.runApplyRules(groupedObjects[group], transformations.APPLY);
            unFilteredCourses.push(groupedObjects[group][0]);
        }

        let filteredCourses: any[] = this.filterForRelevantColumns(unFilteredCourses, columns);

        return filteredCourses;
    }

    public runApplyRules(group: any[], applyRules: any[]): void {
        let dataTranslator: DataTranslator = new DataTranslator();
        for (const applyRule of applyRules) {
            let applyKey: string = Object.keys(applyRule)[0];
            let applyBody: any = applyRule[applyKey];
            let applyToken: string = Object.keys(applyBody)[0];
            let key: string = applyBody[applyToken];
            let field = key.split("_")[1];
            let translatedField = dataTranslator.translateToDataStandard(field);

            let groupValuesForKey: any[] = [];
            for (const entity of group) {
                groupValuesForKey.push(entity[translatedField]);
            }

            let applyValue: number = this.computeApplyValue(groupValuesForKey, applyToken);
            group[0][applyKey] = applyValue;
        }
    }

    public computeApplyValue(groupValuesForKey: any[], applyToken: string): number {
        let applyValue: number;

        switch (applyToken) {
            case "MAX":
                applyValue = Math.max(...groupValuesForKey);
                break;
            case "MIN":
                applyValue = Math.min(...groupValuesForKey);
                break;
            case "AVG":
                applyValue = this.computeAverage(groupValuesForKey);
                break;
            case "SUM":
                applyValue = this.computeSum(groupValuesForKey);
                break;
            case "COUNT":
                applyValue = this.computeUniqueCount(groupValuesForKey);
                break;
            default:
                applyValue = 0;
                break;
        }

        return applyValue;
    }

    public computeAverage(groupValuesForKey: any[]): number {
        let totalValue: Decimal = new Decimal(0);
        for (const value of groupValuesForKey) {
            let decimalValue: Decimal = new Decimal(value);
            totalValue = Decimal.add(totalValue, decimalValue);
        }
        let average: number = totalValue.toNumber() / groupValuesForKey.length;

        let result: number = Number(average.toFixed(2));
        return result;
    }

    public computeSum(groupValuesForKey: any[]): number {
        let sum: number = 0;
        for (const value of groupValuesForKey) {
            sum += value;
        }

        sum = Number(sum.toFixed(2));
        return sum;
    }

    public computeUniqueCount(groupValuesForKey: any[]): number {
        let uniqueValues: any[] = [];
        for (const value of groupValuesForKey) {
            if (!uniqueValues.includes(value)) {
                uniqueValues.push(value);
            }
        }

        return uniqueValues.length;
    }

    private createGroupKey(objectCurrent: any, groupArray: string[]) {
        let objectKeyCurrent: string = groupArray[0].split("_")[1];
        let dataTranslator: DataTranslator = new DataTranslator();
        objectKeyCurrent = dataTranslator.translateToDataStandard(objectKeyCurrent);

        let groupKey: string = objectCurrent[objectKeyCurrent];

        let groupLength = groupArray.length;
        for (let i = 1; i < groupLength; i++) {
            objectKeyCurrent = groupArray[i].split("_")[1];
            objectKeyCurrent = dataTranslator.translateToDataStandard(objectKeyCurrent);
            groupKey = groupKey + " " + objectCurrent[objectKeyCurrent];
        }

        return groupKey;
    }
}
