import {KeyType} from "./KeyType";

export default class KeyValidityChecker {
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

    private datasetIDs: string[] = null;

    constructor(datasetIDs: string[]) {
        this.datasetIDs = datasetIDs;
    }

    public isKeyValid(stringKey: string, keyType: KeyType): boolean {
        let splitStringKey: string[] = stringKey.split("_");
        if (splitStringKey.length !== 2) {
            return false;
        }

        let datasetIDString: string = splitStringKey[0];
        if (datasetIDString === "" || !this.datasetIDs.includes(datasetIDString)) {
            return false;
        }

        let field: string = splitStringKey[1];

        switch (keyType) {
            case KeyType.Mkey:
                return this.areMKeyComponentsValid(datasetIDString, field);
                break;
            case KeyType.Skey:
                return this.areSKeyComponentsValid(datasetIDString, field);
                break;
            case KeyType.General:
                return this.areKeyComponentsValid(datasetIDString, field);
                break;
            default:
                return false;
        }

        return true;
    }

    public areMKeyComponentsValid(datasetIDString: string, field: string): boolean {
        if (datasetIDString === "rooms") {
            if (this.mFieldsValidRooms.includes(field)) {
                return true;
            }
        } else if (datasetIDString === "courses") {
            if (this.mFieldsValidCourses.includes(field)) {
                return true;
            }
        }
        return false;
    }

    public areSKeyComponentsValid(datasetIDString: string, field: string): boolean {
        if (datasetIDString === "rooms") {
            if (this.sFieldsValidRooms.includes(field)) {
                return true;
            }
        } else if (datasetIDString === "courses") {
            if (this.sFieldsValidCourses.includes(field)) {
                return true;
            }
        }
        return false;
    }

    public areKeyComponentsValid(datasetIDString: string, field: string): boolean {
        if (datasetIDString === "rooms") {
            if (this.mFieldsValidRooms.includes(field) || this.sFieldsValidRooms.includes(field)) {
                return true;
            }
        } else if (datasetIDString === "courses") {
            if (this.mFieldsValidCourses.includes(field) || this.sFieldsValidCourses.includes(field)) {
                return true;
            }
        }
        return false;
    }

}
