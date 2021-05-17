import * as parse5 from "parse5";
import * as JSZip from "jszip";
import Log from "../Util";

export interface Room {
    seats: number;
    number: string;
    furniture: string;
    type: string;
    href: string;
}

export enum validRoomTable {
    RoomNum = "views-field views-field-field-room-number",
    Capacity = "views-field views-field-field-room-capacity",
    Furniture = "views-field views-field-field-room-furniture",
    RoomType = "views-field views-field-field-room-type",
    Href = "views-field views-field-nothing",
}

export default class RoomsDataParser {
    private validTable: any;
    private roomsData: Room[];

    private getRoomElement(zip: JSZip, path: string): Promise<any> {
        path = "rooms" + path.substring(1);
        try {
            return Promise.resolve(zip.file(path).async("string"));
        } catch {
            return Promise.reject();
        }
    }

    private setAllRoomData(): void {
        this.roomsData = [];
        if (this.validTable !== "No Valid Table Found") {
            for (let room of this.validTable.childNodes[3].childNodes) {
                if (room.nodeName === "tr") {
                    let newRoom: Room = {
                        seats: null,
                        number: null,
                        furniture: null,
                        type: null,
                        href: null,
                    };
                    newRoom.seats = this.getRoomCapacity(room);
                    newRoom.number = this.getRoomNumber(room);
                    newRoom.furniture = this.getRoomFurniture(room);
                    newRoom.type = this.getRoomRoomType(room);
                    newRoom.href = this.getRoomHREF(room);
                    this.roomsData.push(newRoom);
                }
            }
        }
    }

    public getAllRoomData(zip: JSZip, path: string): Promise<Room[]> {
        return this.getRoomElement(zip, path)
            .then((elementHTML) => {
                if (elementHTML) {
                    return this.parseHTML(elementHTML)
                        .then((parsedData) => {
                            this.validTable = this.getValidRoomTableFromHTML(
                                parsedData,
                            );
                            this.setAllRoomData();
                            return Promise.resolve(this.roomsData);
                        })
                        .catch(() => {
                            return Promise.reject("Failed to get Room Information");
                        });
                }
            })
            .catch(() => {
                return Promise.reject();
            });
    }

    private getValidRoomTableFromHTML(element: any): any {
        if (element.nodeName === "table" && this.isValidRoomTable(element)) {
            return element;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleTable = this.getValidRoomTableFromHTML(child);
                if (possibleTable !== "No Valid Table Found") {
                    return possibleTable;
                }
            }
        }
        return "No Valid Table Found";
    }

    private isValidRoomTable(table: any): boolean {
        for (let tag of table.childNodes[1].childNodes[1].childNodes) {
            if (
                tag.nodeName === "th" &&
                Object.values(validRoomTable).includes(tag.attrs[0].value)
            ) {
                return true;
            }
        }
        return false;
    }

    private getRoomNumber(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validRoomTable.RoomNum
        ) {
            return String(element.childNodes[1].childNodes[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getRoomNumber(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private getRoomCapacity(element: any): number {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validRoomTable.Capacity
        ) {
            return Number(String(element.childNodes[0].value).trim());
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getRoomCapacity(child);
                if (possibleCode !== 0) {
                    return possibleCode;
                }
            }
        }
        return 0;
    }

    private getRoomFurniture(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validRoomTable.Furniture
        ) {
            return String(element.childNodes[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getRoomFurniture(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private getRoomRoomType(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validRoomTable.RoomType
        ) {
            return String(element.childNodes[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getRoomRoomType(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private getRoomHREF(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validRoomTable.Href
        ) {
            return String(element.childNodes[1].attrs[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getRoomHREF(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private parseHTML(html: string): Promise<any> {
        try {
            let parsedHTML = parse5.parse(html);
            return Promise.resolve(parsedHTML);
        } catch {
            return Promise.reject();
        }
    }
}
