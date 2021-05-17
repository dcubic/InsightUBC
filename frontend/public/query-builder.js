
let defaultFields = [
    "dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name", "address", "type",
    "furniture", "href", "avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"
];

let mFields = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sFields = [
    "dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number",
    "name", "address", "type", "furniture", "href"
];

/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    let query = {};
    let whereClause = CampusExplorer.buildWHEREClause();
    query["WHERE"] = whereClause;

    let optionsClause = CampusExplorer.buildOPTIONSClause();
    query["OPTIONS"] = optionsClause;

    try {
        let transformationsClause = CampusExplorer.buildTRANSFORMATIONSClause();
        query["TRANSFORMATIONS"] = transformationsClause;
    } catch (error) {
        //
    }

    return query;
};

const IDTypeEnum = {
    COURSES: 0,
    ROOMS: 1
};

const ConditionsCheckboxType = {
    ALL: 0,
    ANY: 1,
    NONE: 2
}

CampusExplorer.buildWHEREClause = () => {
    // Decide between Courses and Rooms
    let idType = CampusExplorer.determineIDType();
    let conditionsContainer = document.getElementsByClassName("conditions-container");
    let conditions = conditionsContainer[idType];
    let conditionCount = conditions["children"].length;
    if (conditionCount === 0) {
        return {};
    }

    let filterArray = [];
    for (var index = 0; index < conditionCount; index++) {
        let conditionCurrent = conditions["children"][index]["children"];

        let notBlock = conditionCurrent[0];
        let fieldBlock = conditionCurrent[1];
        let operatorBlock = conditionCurrent[2];
        let controlTermBlock = conditionCurrent[3];

        let isNotCheckedCurrent = notBlock["children"][0].checked;
        let fieldCurrent = fieldBlock["children"][0].value;
        let operatorCurrent = operatorBlock["children"][0].value;
        let comparisonValue = controlTermBlock["children"][0].value;
        if (mFields.includes(fieldCurrent)) {
            comparisonValue = Number(comparisonValue);
        }

        filterCurrent = {};
        filterTemporary = {};
        skeyInputStringNestedObject = {};
        let key = CampusExplorer.createKey(idType, fieldCurrent);
        skeyInputStringNestedObject[key] = comparisonValue;
        filterTemporary[operatorCurrent] = skeyInputStringNestedObject;

        if (isNotCheckedCurrent) {
            filterCurrent["NOT"] = filterTemporary;
        } else {
            filterCurrent = filterTemporary;
        }
        filterArray.push(filterCurrent);
    }

    let conditionsCheckboxType = CampusExplorer.determineCheckboxType(idType);
    let finalWhereClause = CampusExplorer.finalizeWHEREClause(filterArray, conditionsCheckboxType);
    return finalWhereClause;
}

CampusExplorer.determineIDType = () => {
    let idType = IDTypeEnum.COURSES;
    let activeTab = document.getElementsByClassName("tab-panel active")[0].id;
    if (activeTab === "tab-rooms") {
        idType = IDTypeEnum.ROOMS;
    }
    return idType;
}

CampusExplorer.createKey = (idType, fieldCurrent) => {
    let key = "courses";
    if (idType === IDTypeEnum.ROOMS) {
        key = "rooms";
    }
    let lowercaseField = fieldCurrent.toLowerCase();
    key = key + "_" + lowercaseField;
    return key;
}

CampusExplorer.determineCheckboxType = (idType) => {
    let controlConditionAll = document.getElementsByClassName("control conditions-all-radio");
    let controlConditionAny = document.getElementsByClassName("control conditions-any-radio");
    //let controlConditionNone = document.getElementsByClassName("control conditions-all-radio");

    let isAllChecked = controlConditionAll[idType]["children"][0].checked;
    let isAnyChecked = controlConditionAny[idType]["children"][0].checked;
    //let isNoneChecked = controlConditionAll[idType]["children"][0].checked;
    if (isAllChecked) {
        return ConditionsCheckboxType.ALL;
    } else if (isAnyChecked) {
        return ConditionsCheckboxType.ANY;
    } else {
        return ConditionsCheckboxType.NONE;
    }
}

CampusExplorer.finalizeWHEREClause = (filterArray, conditionsCheckboxType) => {
    let filterCount = filterArray.length;
    let finalFilter = {};
    if (filterCount === 1) {
        if (conditionsCheckboxType === ConditionsCheckboxType.NONE) {
            finalFilter["NOT"] = filterArray[0];
        } else {
            finalFilter = filterArray[0];
        }
    } else {
        if (conditionsCheckboxType === ConditionsCheckboxType.ALL) {
            finalFilter["AND"] = filterArray;
        } else if (conditionsCheckboxType === ConditionsCheckboxType.ANY) {
            finalFilter["OR"] = filterArray;
        } else {
            let nestedOrFilter = {};
            nestedOrFilter["OR"] = filterArray;
            finalFilter["NOT"] = nestedOrFilter;
        }
    }

    return finalFilter;
}

CampusExplorer.buildOPTIONSClause = () => {
    let idType = CampusExplorer.determineIDType();
    let columnsContainer = document.getElementsByClassName("form-group columns");
    let columns = columnsContainer[idType]["children"][1]["children"];
    let columnsCount = columns.length;

    columnIDArray = [];
    for (var index = 0; index < columnsCount; index++) {
        let columnCurrent = columns[index]["children"];
        let isColumnChecked = columnCurrent[0].checked;
        if (isColumnChecked) {
            let columnFieldCurrent = columnCurrent[0].value;
            let columnKey = columnFieldCurrent;
            if (defaultFields.includes(columnFieldCurrent)) {
                columnKey = CampusExplorer.createKey(idType, columnFieldCurrent);
            }
            columnIDArray.push(columnKey);
        }
    }

    let optionsQuery = {};
    optionsQuery["COLUMNS"] = columnIDArray;

    // Determine the columns used for ordering
    let orderContainer = document.getElementsByClassName("form-group order");
    let selectedOrderingColumns =
        orderContainer[idType]["children"][1]["children"][0]["children"][0].selectedOptions;
    let selectedOrderCount = selectedOrderingColumns.length;

    if (selectedOrderCount !== 0) {
        orderIDArray = [];
        for (var index = 0; index < selectedOrderCount; index++) {
            let orderingColumnCurrent = selectedOrderingColumns[index];
            let orderingColumnFieldCurrent = orderingColumnCurrent.value;
            let orderKey = orderingColumnFieldCurrent;
            if (defaultFields.includes(orderingColumnFieldCurrent)) {
                orderKey = CampusExplorer.createKey(idType, orderingColumnFieldCurrent);
            }
            orderIDArray.push(orderKey);
        }

        // Determine if the columns are in descending order
        let isDescending = orderContainer[idType]["children"][1]["children"][1]["children"][0].checked;

        let orderQuery = {};
        if (isDescending) {
            orderQuery["dir"] = "DOWN";
        } else {
            orderQuery["dir"] = "UP";
        }
        orderQuery["keys"] = orderIDArray;
        optionsQuery["ORDER"] = orderQuery;
    }

    return optionsQuery;
}

CampusExplorer.buildTRANSFORMATIONSClause = () => {
    let idType = CampusExplorer.determineIDType();
    let groupsContainer = document.getElementsByClassName("form-group groups");
    let groups = groupsContainer[idType]["children"][1]["children"];
    let groupsCount = groups.length;

    groupIDs = [];
    for (var index = 0; index < groupsCount; index++) {
        let groupCurrent = groups[index]["children"];
        let isGroupChecked = groupCurrent[0].checked;
        let groupField = groupCurrent[0].value;
        let groupKeyCurrent = CampusExplorer.createKey(idType, groupField);
        if (isGroupChecked) {
            groupIDs.push(groupKeyCurrent);
        }
    }

    // Determine the transformations clause
    let transformationsContainer = document.getElementsByClassName("transformations-container");
    let transformations = transformationsContainer[idType]["children"];
    let transformationCount = transformations.length;

    if (groupIDs.length === 0 && transformationCount === 0) {
        throw new Error("No Transformations Clause");
    }

    let applyKeyArray = [];
    for (var index = 0; index < transformationCount; index++) {
        let transformationCurrent = transformations[index];

        let applyKeyCurrent = transformationCurrent["children"][0]["children"][0].value;
        let applyOperation = transformationCurrent["children"][1]["children"][0].value;
        let targetField = transformationCurrent["children"][2]["children"][0].value;
        let targetKey = CampusExplorer.createKey(idType, targetField);

        let nestedApplyObject = {};
        nestedApplyObject[applyOperation] = targetKey;
        let applyKeyObject = {};
        applyKeyObject[applyKeyCurrent] = nestedApplyObject;

        applyKeyArray.push(applyKeyObject);
    }

    transformationsQuery = {};
    transformationsQuery["GROUP"] = groupIDs;
    transformationsQuery["APPLY"] = applyKeyArray;
    return transformationsQuery;
};
