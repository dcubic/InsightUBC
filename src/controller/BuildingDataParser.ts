import * as JSZip from "jszip";
import RoomsDataParser from "./RoomsDataParser";
import { JSZipObject } from "jszip";
import * as http from "http";
import * as parse5 from "parse5";
import Log from "../Util";
import { IncomingMessage } from "http";

export enum validIndexTable {
    Code = "views-field views-field-field-building-code",
    Title = "views-field views-field-title",
    Address = "views-field views-field-field-building-address",
    Link = "views-field views-field-nothing"
}

export interface Building {
    buildingCode: string;
    buildingFull: string;
    buildingAddr: string;
    buildingGeo: string;
    buildingLink: string;
    rooms: [];
}

interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}

export default class BuildingDataParser {
    public getRoomDataForBuildings(
        buildingData: any[],
        roomsZip: JSZip,
    ): Promise<any> {
        let promisesList = Array<Promise<any>>();
        for (let building of buildingData) {
            if (building.buildingLink !== "") {
                let roomDataParser = new RoomsDataParser();
                promisesList.push(
                    roomDataParser
                        .getAllRoomData(roomsZip, building.buildingLink)
                        .then((roomData) => {
                            building.rooms = roomData;
                        }).catch(() => {
                            building.rooms = [];
                    }),
                );
            }
        }
        return Promise.all(promisesList).then(() => {
            return buildingData;
        });
    }

    public getBuildingsFromIndexHTM(indexHTM: JSZipObject): Promise<any[]> {
        let buildingData: any[] = [];
        let geoPromiseList = Array<Promise<any>>();
        return indexHTM
            .async("string")
            .then(this.parseHTML)
            .then((parsedData) => {
                let validBuildingTable = this.getValidTableFromIndexHTM(
                    parsedData,
                );
                for (let building of validBuildingTable.childNodes[3]
                    .childNodes) {
                    if (building.nodeName === "tr") {
                        let newBuilding: Building = {
                            buildingCode: null,
                            buildingFull: null,
                            buildingAddr: null,
                            buildingGeo: null,
                            buildingLink: null,
                            rooms: [],
                        };
                        newBuilding.buildingAddr = this.getBuildingAddress(
                            building,
                        );
                        geoPromiseList.push(
                            this.getBuildingGeoData(
                                newBuilding.buildingAddr,
                            ).then((geoData) => {
                                newBuilding.buildingGeo = geoData;
                            }),
                        );
                        newBuilding.buildingCode = this.getBuildingCode(
                            building,
                        );
                        newBuilding.buildingFull = this.getBuildingTitle(
                            building,
                        );
                        newBuilding.buildingLink = this.getBuildingRoomLink(
                            building,
                        );
                        buildingData.push(newBuilding);
                    }
                }
                return Promise.all(geoPromiseList).then(() => {
                    return Promise.resolve(buildingData);
                });
            });
    }

    private getValidTableFromIndexHTM(element: any): any {
        if (
            element.nodeName === "table" &&
            this.isValidBuildingTable(element)
        ) {
            return element;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleTable = this.getValidTableFromIndexHTM(child);
                if (possibleTable !== "No Valid Table Found") {
                    return possibleTable;
                }
            }
        }
        return "No Valid Table Found";
    }

    private isValidBuildingTable(table: any): boolean {
        for (let tag of table.childNodes[1].childNodes[1].childNodes) {
            if (
                tag.nodeName === "th" &&
                Object.values(validIndexTable).includes(tag.attrs[0].value)
            ) {
                return true;
            }
        }
        return false;
    }

    private getBuildingCode(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validIndexTable.Code
        ) {
            return String(element.childNodes[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getBuildingCode(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private getBuildingTitle(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validIndexTable.Title
        ) {
            return String(element.childNodes[1].childNodes[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getBuildingTitle(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private getBuildingAddress(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validIndexTable.Address
        ) {
            return String(element.childNodes[0].value).trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getBuildingAddress(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    public getBuildingGeoData(addr: string): Promise<any> {
        addr = addr.replace(/\s/g, "%20");
        let uri =
            "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team189/" +
            addr;
        return this.getHTTPGeoDataReturn(uri)
            .then((geoResp) => {
                return Promise.resolve(geoResp);
            })
            .catch(() => {
                return Promise.resolve("");
            });
    }

    private getHTTPGeoDataReturn(uri: string): Promise<any> {
        return new Promise((resolve, reject) => {
            http.get(uri, (message) => {
                this.asyncHTTPRequest(message)
                    .then((geoReturn) => {
                        return resolve(geoReturn);
                    })
                    .catch(() => {
                        return reject();
                    });
            });
        });
    }

    private asyncHTTPRequest(message: IncomingMessage): Promise<any> {
        let geoReturn = "";
        return new Promise((resolve, reject) => {
            return message
                .on("data", (data) => {
                    geoReturn += data;
                    return resolve(geoReturn);
                })
                .on("error", (error) => {
                    return reject();
                });
        });
    }

    private getBuildingRoomLink(element: any): string {
        if (
            element.nodeName === "td" &&
            element.attrs[0].value === validIndexTable.Link
        ) {
            return String(element.childNodes[1].attrs[0].value);
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleCode = this.getBuildingRoomLink(child);
                if (possibleCode !== "") {
                    return possibleCode;
                }
            }
        }
        return "";
    }

    private parseHTML(html: string): Promise<any> {
        return Promise.resolve(parse5.parse(html));
    }
}
