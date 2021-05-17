export default class CourseSorter {

    public sortCourses(courses: any[], sortingProperty: any): void {
        let sortingPropertyType = Object.prototype.toString.call(sortingProperty);
        if (sortingPropertyType === "[object String]") {
            courses.sort(function (object1, object2) {
                if (typeof object1[sortingProperty] === "string") {
                    if (object1[sortingProperty] < object2[sortingProperty]) {
                        return -1;
                    } else if (object1[sortingProperty] < object2[sortingProperty]) {
                        return 1;
                    } else {
                        return 0;
                    }
                } else {
                    return object1[sortingProperty] - object2[sortingProperty];
                }
            });
        } else {
            let direction: string = sortingProperty["dir"];
            let keyHeirarchy: string[] = sortingProperty["keys"];
            let keyCount: number = keyHeirarchy.length;
            let courseSorter = this;
            courses.sort(function (object1, object2) {

                for (const key of keyHeirarchy) {
                    let evaluationValue: number;
                    if (direction === "UP") {
                        if (typeof object1[key] === "string") {
                            evaluationValue = courseSorter.stringCompare(object1[key], object2[key]);
                        } else {
                            evaluationValue = object1[key] - object2[key];
                        }
                    } else {
                        if (typeof object1[key] === "string") {
                            evaluationValue = courseSorter.stringCompare(object2[key], object1[key]);
                        } else {
                            evaluationValue = object2[key] - object1[key];
                        }
                    }
                    if (evaluationValue !== 0) {
                        return evaluationValue;
                    }
                }

                return 0;
            });
        }
    }

    public stringCompare(string1: string, string2: string): number {
        let evaluationValue: number;
        if (string1 < string2) {
            evaluationValue = -1;
        } else if (string1 > string2) {
            evaluationValue = 1;
        } else {
            evaluationValue = 0;
        }
        return evaluationValue;
    }
}
