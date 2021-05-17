export default class ObjectConverter {
    private mFieldsValid: string[] = ["Avg", "Pass", "Fail", "Audit", "Year"];

    public convertObject(objectToConvert: any) {
        let keys: string[] = Object.keys(objectToConvert);
        for (const key of keys) {
            if (this.mFieldsValid.includes(key)) {
                objectToConvert[key] = Number(objectToConvert[key]);
            }
            if (key === "id") {
                objectToConvert[key] = objectToConvert[key].toString();
            }
        }
    }
}
