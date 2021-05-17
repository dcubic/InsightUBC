import Log from "../Util";
import KeyValidityChecker from "./KeyValidityChecker";
import TransformationsValidityChecker from "./TransformationsValidityChecker";
import {KeyType} from "./KeyType";

export default class QueryValidator {
    private mComparators: string[] = ["EQ", "GT", "LT"];
    private sComparators: string[] = ["IS"];
    private logicComparison: string[] = ["OR", "AND"];

    private applyTokensPossible: string[] = [
        "MAX", "MIN", "AVG", "COUNT", "SUM"
    ];

    private datasetIDs: string[] = null;

    private keyValidityChecker: KeyValidityChecker = null;

    constructor(datasetIDs: string[]) {
        this.datasetIDs = datasetIDs;
        this.keyValidityChecker = new KeyValidityChecker(datasetIDs);
    }

    public isQueryValid(query: any): boolean {
        let keys: string[] = Object.keys(query);
        if (!keys.includes("WHERE") || !keys.includes("OPTIONS")) {
            return false;
        }
        for (const key of keys) {
            if (key !== "WHERE" && key !== "OPTIONS" && key !== "TRANSFORMATIONS") {
                return false;
            }
        }
        let whereType: string = Object.prototype.toString.call(query.WHERE);
        let optionsType: string = Object.prototype.toString.call(query.OPTIONS);
        if (whereType !== "[object Object]" || optionsType !== "[object Object]") {
            return false;
        }
        let groupKeys: string[] = [];
        let applyKeys: string[] = [];
        let uniqueDatasetIDStrings: string[] = [];
        if (keys.includes("TRANSFORMATIONS")) {
            let transformationsType: string = Object.prototype.toString.call(query.TRANSFORMATIONS);
            if (transformationsType !== "[object Object]") {
                return false;
            }
            let transformationsValidityChecker: TransformationsValidityChecker =
                new TransformationsValidityChecker(this.datasetIDs);
            if (!transformationsValidityChecker.isTransformationsValid(query.TRANSFORMATIONS,
                                                                      uniqueDatasetIDStrings,
                                                                      groupKeys, applyKeys)) {
                return false;
            }
        }

        if (!this.isOptionsValid(query.OPTIONS, uniqueDatasetIDStrings, groupKeys, applyKeys)) {
            return false;
        }
        if (Object.entries(query.WHERE).length === 0) {
            return true;
        }
        if (!this.isFilterValid(query.WHERE, uniqueDatasetIDStrings)) {
            return false;
        }
        if (uniqueDatasetIDStrings.length > 1) {
            return false;
        }
        return true;
    }

    public isFilterValid(query: any, uniqueDatasetIDStrings: string[]): boolean {
        let typeQuery: string = Object.prototype.toString.call(query);
        if (typeQuery !== "[object Object]") {
            return false;
        }

        let key: string = Object.keys(query)[0];
        if (!this.isFilterKeyValid(key)) {
            return false;
        }

        if (this.sComparators.includes(key)) {
            return this.isSComparisonValid(query, uniqueDatasetIDStrings);
        } else if (this.mComparators.includes(key)) {
            return this.isMComparisonValid(query, uniqueDatasetIDStrings);
        } else if (key === "NOT") {
            if (Object.keys(query[key]).length > 1) {
                return false;
            }
            return this.isFilterValid(query[key], uniqueDatasetIDStrings);
        } else {
            let nestedType: string = Object.prototype.toString.call(query[key]);
            if (nestedType !== "[object Array]") {
                return false;
            }
            let nestedFilters: any[] = query[key];
            if (nestedFilters.length === 0) {
                return false;
            }

            for (const nestedFilter of nestedFilters) {
                if (typeof nestedFilter !== "object" || !this.isFilterValid(nestedFilter, uniqueDatasetIDStrings)) {
                    return false;
                }
                if (Object.keys(nestedFilter).length > 1) {
                    return false;
                }
            }

            return true;
        }
    }

    public isSComparisonValid(query: any, uniqueDatasetIDStrings: string[]): boolean {
        let keyIs: string = Object.keys(query)[0];
        if (keyIs !== "IS") {
            return false;
        }

        let nestedType: string = Object.prototype.toString.call(query[keyIs]);
        if (nestedType !== "[object Object]") {
            return false;
        }

        let nextLevelQuery: string = query[keyIs];
        let nextLevelKeys: string[] = Object.keys(nextLevelQuery);
        if (nextLevelKeys.length !== 1) {
            return false;
        }

        let stringKey: string = nextLevelKeys[0];
        if (!this.keyValidityChecker.isKeyValid(stringKey, KeyType.Skey)) {
            return false;
        }
        if (typeof query[keyIs][stringKey] !== "string") {
            return false;
        }

        let inputString: string = query[keyIs][stringKey];
        if (!this.isInputStringValid(inputString)) {
            return false;
        }
        return true;
    }

    public isMComparisonValid(query: any, uniqueDatasetIDStrings: string[]): boolean {
        let keyMComparitor: string = Object.keys(query)[0];
        if (!this.mComparators.includes(keyMComparitor)) {
            return false;
        }

        let nestedType: string = Object.prototype.toString.call(
            query[keyMComparitor],
        );
        if (nestedType !== "[object Object]") {
            return false;
        }

        let nextLevelQuery: string = query[keyMComparitor];
        let nextLevelKeys: string[] = Object.keys(nextLevelQuery);
        if (nextLevelKeys.length !== 1) {
            return false;
        }

        let stringKey: string = nextLevelKeys[0];
        if (!this.keyValidityChecker.isKeyValid(stringKey, KeyType.Mkey)) {
            return false;
        }
        if (typeof query[keyMComparitor][stringKey] !== "number") {
            return false;
        }

        return true;
    }

    public isFilterKeyValid(key: string): boolean {
        if (this.mComparators.includes(key) || this.sComparators.includes(key) ||
            this.logicComparison.includes(key) || key === "NOT") {
            return true;
        } else {
            return false;
        }
    }

    public isOptionsValid(query: any, uniqueDatasetIDStrings: string[],
                          groupKeys: string[], applyKeys: string[]): boolean {
        let keys: string[] = Object.keys(query);
        if (!keys.includes("COLUMNS")) {
            return false;
        }
        let columnsAccessType: string = Object.prototype.toString.call(
            query["COLUMNS"],
        );
        if (columnsAccessType !== "[object Array]") {
            return false;
        }
        let columnsArray: any[] = query["COLUMNS"];
        if (columnsArray.length === 0) {
            return false;
        }
        for (const columnID of columnsArray) {
            if (typeof columnID !== "string") {
                return false;
            }
            if (!this.isColumnIDValid(columnID, groupKeys, applyKeys)) {
                return false;
            }
        }

        if (keys.includes("ORDER")) {
            if (!this.isOrderValid(query["ORDER"], columnsArray)) {
                return false;
            }
        }

        for (const key of keys) {
            if (key !== "COLUMNS" && key !== "ORDER") {
                return false;
            }
        }
        return true;
    }

    private isInputStringValid(inputString: string): boolean {
        let characterFirst: string = inputString.charAt(0);
        let characterLast: string = inputString.charAt(inputString.length - 1);
        if (inputString.charAt(0) === "*") {
            inputString = inputString.substring(1, inputString.length);
        }
        if (inputString.charAt(inputString.length - 1) === "*") {
            inputString = inputString.substring(0, inputString.length - 1);
        }

        let splitInputString: string[] = inputString.split("*");
        if (splitInputString.length > 1) {
            return false;
        }
        return true;
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
}
