import {KeyType} from "./KeyType";
import KeyValidityChecker from "./KeyValidityChecker";

export default class TransformationsValidityChecker {
    private sFieldsValidCourses: string[] = [
        "dept", "id", "instructor", "title", "uuid"
    ];

    private sFieldsValidRooms: string[] = [
        "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"
    ];

    private mFieldsValidCourses: string[] = [
        "avg", "pass", "fail", "audit", "year"
    ];

    private mFieldsValidRooms: string[] = [
        "lat", "lon", "seats"
    ];

    private applyTokensPossible: string[] = [
        "MAX", "MIN", "AVG", "COUNT", "SUM"
    ];

    private datasetIDs: string[] = null;

    private keyValidityChecker: KeyValidityChecker;

    constructor(datasetIDs: string[]) {
        this.datasetIDs = datasetIDs;
        this.keyValidityChecker = new KeyValidityChecker(datasetIDs);
    }

    public isTransformationsValid(query: any, datasetsSeen: string[],
                                  groupKeys: string[], applyKeys: string[]): boolean {
        let keysGroupAndApply: string[] = Object.keys(query);
        if (!keysGroupAndApply.includes("GROUP") || !keysGroupAndApply.includes("APPLY")) {
            return false;
        }

        if (keysGroupAndApply.length !== 2) {
            return false;
        }

        let groupType: string = Object.prototype.toString.call(query["GROUP"]);
        let applyType: string = Object.prototype.toString.call(query["APPLY"]);
        let expectedGroupAndApplyType: string = "[object Array]";

        if (groupType !== expectedGroupAndApplyType || applyType !== expectedGroupAndApplyType) {
            return false;
        }

        if (!this.isGroupValid(query["GROUP"], datasetsSeen, groupKeys) ||
            !this.isApplyValid(query["APPLY"], datasetsSeen, applyKeys)) {
            return false;
        }

        return true;
    }

    public isGroupValid(query: any, datasetsSeen: string[], groupKeys: string[]): boolean {
        let groupValueType: string = Object.prototype.toString.call(query);
        let expectedGroupValueType: string = "[object Array]";
        if (groupValueType !== expectedGroupValueType) {
            return false;
        }
        if (query.length === 0) {
            return false;
        }

        for (const key of query) {
            if (typeof key !== "string") {
                return false;
            }
            if (!this.keyValidityChecker.isKeyValid(key, KeyType.General)) {
                return false;
            }
            this.updateUniqueDatasetIDStrings(datasetsSeen, key);
            if (!groupKeys.includes(key)) {
                groupKeys.push(key);
            }
        }

        return true;
    }

    public isApplyValid(query: any, datasetsSeen: string[], applyKeys: string[]): boolean {
        let applyValueType: string = Object.prototype.toString.call(query);
        let expectedApplyValueType: string = "[object Array]";
        if (applyValueType !== expectedApplyValueType) {
            return false;
        }

        let applyKeysSeenThusFar: string[] = [];
        for (const applyRule of query) {
            let applyRuleType: string = Object.prototype.toString.call(applyRule);
            let expectedApplyRuleType: string = "[object Object]";
            if (applyRuleType !== expectedApplyRuleType) {
                return false;
            }

            let applyKeysCurrent: string[] = Object.keys(applyRule);
            if (applyKeysCurrent.length !== 1) {
                return false;
            }

            applyKeysSeenThusFar.push(applyKeysCurrent[0]);

            if (!this.isOperationLayerValid(applyRule, applyKeysCurrent)) {
                return false;
            }

            let applyRuleContents = applyRule[applyKeysCurrent[0]];
            let applyToken = Object.keys(applyRuleContents)[0];
            let nestedKey = applyRuleContents[applyToken];
            if (!this.isKeyLayerValid(nestedKey)) {
                return false;
            }
            let splitStringKey: string[] = nestedKey.split("_");
            let datasetIDString: string = splitStringKey[0];
            let fieldString: string = splitStringKey[1];

            if (!this.areTokenAndFieldComboValid(applyToken, fieldString)) {
                return false;
            }

            if (!datasetsSeen.includes(datasetIDString)) {
                datasetsSeen.push(datasetIDString);
            }
        }
        for (const key of applyKeysSeenThusFar) {
            applyKeys.push(key);
        }
        return true;
    }

    public areTokenAndFieldComboValid(applyToken: string, fieldString: string): boolean {
        if (applyToken === "COUNT") {
            return true;
        } else if (this.applyTokensPossible.includes(applyToken) && this.isMKey(fieldString)) {
            return true;
        } else {
            return false;
        }
    }

    public isMKey(fieldString: string): boolean {
        if (this.mFieldsValidRooms.includes(fieldString) || this.mFieldsValidCourses.includes(fieldString)) {
            return true;
        } else {
            return false;
        }
    }

    public updateUniqueDatasetIDStrings(uniqueDatasetIDStrings: string[], key: string): void {
        let splitStringKey: string[] = key.split("_");
        let datasetIDString: string = splitStringKey[0];

        if (!uniqueDatasetIDStrings.includes(datasetIDString)) {
            uniqueDatasetIDStrings.push(datasetIDString);
        }
    }

    public isColumnIDValid(columnID: string, groupKeys: string[], applyKeys: string[]): boolean {
        if (groupKeys.length === 0 && applyKeys.length === 0) {
            return this.keyValidityChecker.isKeyValid(columnID, KeyType.General);
        }
        if (groupKeys.includes(columnID) || applyKeys.includes(columnID)) {
            return true;
        }
        return false;
    }

    public isOrderValid(orderQuery: any, columnsArray: string[]): boolean {
        let orderType: string = Object.prototype.toString.call(orderQuery);
        if (orderType === "[object String]") {
            if (!this.keyValidityChecker.isKeyValid(orderQuery, KeyType.General) ||
                                                    !columnsArray.includes(orderQuery)) {
                return false;
            }
        } else if (orderType !== "[object Object]") {
            return false;
        } else {

            // Handle overall object
            let orderKeys: string[] = Object.keys(orderQuery);
            if (!orderKeys.includes("dir") || !orderKeys.includes("keys")) {
                return false;
            }
            if (orderKeys.length !== 2) {
                return false;
            }

            // Handle dir
            if (orderQuery["dir"] !== "UP" && orderQuery["dir"] !== "DOWN") {
                return false;
            }

            // Handle keys
            let keysType: string = Object.prototype.toString.call(orderQuery["keys"]);
            if (keysType !== "[object Array]") {
                return false;
            }

            let keysArray: string[] = orderQuery["keys"];

            if (keysArray.length === 0) {
                return false;
            }

            for (const key of keysArray) {
                if (!columnsArray.includes(key)) {
                    return false;
                }
            }
        }
        return true;
    }

    public isKeyLayerValid(nestedKey: string) {
        let nestedKeyType = typeof nestedKey;
        let nestedKeyExpectedType = "string";

        if (nestedKeyType !== nestedKeyExpectedType) {
            return false;
        }

        if (!this.keyValidityChecker.isKeyValid(nestedKey, KeyType.General)) {
            return false;
        }

        return true;
    }

    public isOperationLayerValid(applyRule: any, applyKeysCurrent: string[]): boolean {
        let applyRuleContents = applyRule[applyKeysCurrent[0]];
        let applyRuleContentsType = Object.prototype.toString.call(applyRuleContents);
        let expectedApplyRuleContentsType = "[object Object]";

        if (applyRuleContentsType !== expectedApplyRuleContentsType) {
            return false;
        }

        let applyTokens = Object.keys(applyRuleContents);

        if (applyTokens.length !== 1) {
            return false;
        }

        let applyToken = applyTokens[0];

        if (!this.applyTokensPossible.includes(applyToken)) {
            return false;
        }
        return true;
    }
}
