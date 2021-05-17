export default class DataTranslator {
    // TODO: this should be in a separate class
    public translateToDataStandard(identifier: string): string {
        let translatedString: string = null;
        switch (identifier) {
            case "title":
                translatedString = "Title";
                break;
            case "uuid":
                translatedString = "id";
                break;
            case "instructor":
                translatedString = "Professor";
                break;
            case "audit":
                translatedString = "Audit";
                break;
            case "year":
                translatedString = "Year";
                break;
            case "id":
                translatedString = "Course";
                break;
            case "pass":
                translatedString = "Pass";
                break;
            case "fail":
                translatedString = "Fail";
                break;
            case "avg":
                translatedString = "Avg";
                break;
            case "dept":
                translatedString = "Subject";
                break;
            default:
                translatedString = identifier;
        }
        return translatedString;
    }
}
