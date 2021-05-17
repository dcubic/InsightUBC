import DataTranslator from "./DataTranslator";
import Log from "../Util";

export default class SectionValidator {
    private mComparators: string[] = ["EQ", "GT", "LT"];
    private sComparators: string[] = ["IS"];

    public isSectionValid(query: any, sectionDataObject: any): boolean {
        if (Object.keys(query).length === 0) {
            return true; // this should only occur when WHERE: {}
        }
        let key: string = Object.keys(query)[0];

        if (this.sComparators.includes(key)) {
            return this.isSComparatorStatementTrue(
                query[key],
                sectionDataObject,
            );
        } else if (this.mComparators.includes(key)) {
            return this.isMComparatorStatementTrue(query, sectionDataObject);
        } else if (key === "NOT") {
            return !this.isSectionValid(query[key], sectionDataObject);
        } else {
            let filterCount: number = query[key].length;
            let nestedBoolean: boolean = this.isSectionValid(
                query[key][0],
                sectionDataObject,
            );
            for (let i = 1; i < filterCount; i++) {
                if (key === "OR") {
                    nestedBoolean =
                        nestedBoolean ||
                        this.isSectionValid(query[key][i], sectionDataObject);
                } else {
                    nestedBoolean =
                        nestedBoolean &&
                        this.isSectionValid(query[key][i], sectionDataObject);
                }
            }
            return nestedBoolean;
        }
    }

    public isSComparatorStatementTrue(query: any, sectionDataObject: any): boolean {
        let key: string = Object.keys(query)[0];
        let comparedValue: string = query[key];
        let identifier: string = key.split("_")[1];
        let dataTranslator: DataTranslator = new DataTranslator();
        let sectionDataObjectKey: string = dataTranslator.translateToDataStandard(
            identifier
        );

        if (comparedValue.startsWith("*") && comparedValue.endsWith("*")) {
            return sectionDataObject[sectionDataObjectKey].includes(
                comparedValue.substring(1, comparedValue.length - 1),
            );
        } else if (comparedValue.startsWith("*")) {
            return sectionDataObject[sectionDataObjectKey].endsWith(
                comparedValue.substring(1, comparedValue.length),
            );
        } else if (comparedValue.endsWith("*")) {
            return sectionDataObject[sectionDataObjectKey].startsWith(
                comparedValue.substring(0, comparedValue.length - 1),
            );
        } else {
            return sectionDataObject[sectionDataObjectKey] === comparedValue;
        }
    }

    // TODO: make sure all the type translation works

    public isMComparatorStatementTrue(
        query: any,
        sectionDataObject: any,
    ): boolean {
        let comparisonOperation: string = Object.keys(query)[0];
        let nestedQuery: any = query[comparisonOperation];
        let key: string = Object.keys(nestedQuery)[0];
        let comparedValue: number = nestedQuery[key];
        let identifier: string = key.split("_")[1];
        let dataTranslator: DataTranslator = new DataTranslator();
        let sectionDataObjectKey: string = dataTranslator.translateToDataStandard(
            identifier,
        );

        // console.log(typeof sectionDataObject[sectionDataObjectKey]);

        if (comparisonOperation === "EQ") {
            return sectionDataObject[sectionDataObjectKey] === comparedValue;
        } else if (comparisonOperation === "GT") {
            return sectionDataObject[sectionDataObjectKey] > comparedValue;
        } else {
            return sectionDataObject[sectionDataObjectKey] < comparedValue;
        }
    }
}
