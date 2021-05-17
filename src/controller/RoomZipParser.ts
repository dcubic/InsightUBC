import {InsightDataset, InsightDatasetKind, InsightError, } from "./IInsightFacade";
import {Room} from "./RoomsDataParser";
import BuildingDataParser, {Building} from "./BuildingDataParser";
import * as JSZip from "jszip";
import * as fs from "fs-extra";
import Log from "../Util";

interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}

export default class CourseZipParser {
    private roomCacheDir = __dirname + "/../../data/rooms/";
    private idPath: string;

    public addRoomKindDataset(id: string, content: string): Promise<any> {
        this.idPath = this.roomCacheDir + id;
        return JSZip.loadAsync(content, { base64: true })
            .then((zip) => {
                if (this.checkContainsRoomFolder(zip)) {
                    return this.completeRoomFilter(id, zip);
                }
                return Promise.reject(new InsightError());
            })
            .catch(() => {
                fs.rmdirSync(this.idPath);
                return Promise.reject(new InsightError());
            });
    }

    private completeRoomFilter(id: string, zip: JSZip): Promise<any> {
        return this.getValidBuildings(zip).then((buildingData) => {
            fs.mkdirSync(this.idPath);
            this.saveAllBuildingRoomDataToDisk(buildingData).then(() => {
                if (fs.readdirSync(this.idPath).length !== 0) {
                    return Promise.resolve(id);
                }
                fs.rmdirSync(this.idPath);
                return Promise.reject();
            });
        });
    }

    private getValidBuildings(roomsZip: JSZip): Promise<any> {
        let buildingDataParser: BuildingDataParser = new BuildingDataParser();
        return buildingDataParser
            .getBuildingsFromIndexHTM(
                roomsZip.folder("rooms").file("index.htm"),
            )
            .then((buildingData) => {
                return buildingDataParser
                    .getRoomDataForBuildings(buildingData, roomsZip)
                    .then(() => {
                        return Promise.resolve(buildingData);
                    })
                    .catch(() => {
                        return Promise.reject(new InsightError());
                    });
            })
            .catch(() => {
                return Promise.reject(new InsightError());
            });
    }

    private saveAllBuildingRoomDataToDisk(buildingData: any): Promise<any> {
        let buildingsPromiseList = Array<Promise<any>>();
        for (let building of buildingData) {
            buildingsPromiseList.push(this.saveBuildingDataToDisk(building));
        }
        return Promise.all(buildingsPromiseList);
    }

    private saveBuildingDataToDisk(building: Building): Promise<any> {
        let roomsPromiseList = Array<Promise<any>>();
        for (let room of building.rooms) {
            roomsPromiseList.push(this.saveRoomDataToDisk(room, building));
        }
        return Promise.all(roomsPromiseList);
    }

    private saveRoomDataToDisk(room: Room, building: Building): Promise<any> {
        let fullName = building.buildingFull;
        let shortName = building.buildingCode;
        let roomNumber = room.number;
        let name = shortName + "_" + roomNumber;
        let address = building.buildingAddr;
        let geo = building.buildingGeo;
        //
        let geoObject = JSON.parse(geo);
        let lat = geoObject.lat;
        let lon = geoObject.lon;
        //
        let seats = room.seats;
        let type = room.type;
        let furniture = room.furniture;
        let href = room.href;
        let obj = {
            fullname: fullName,
            shortname: shortName,
            number: roomNumber,
            name: name,
            address: address,
            lat: lat,
            lon: lon,
            seats: seats,
            type: type,
            furniture: furniture,
            href: href,
        };
        let path = this.idPath + "/" + name + ".json";
        fs.writeFileSync(path, JSON.stringify(obj));
        return Promise.resolve();
    }

    private checkContainsRoomFolder(zip: JSZip): boolean {
        return zip.folder(/^rooms\//).length > 0;
    }

    public countRoomRows(id: string): InsightDataset {
        let path = this.roomCacheDir + id;
        let numRooms = fs.readdirSync(path).length;
        return {
            id: id,
            kind: InsightDatasetKind.Rooms,
            numRows: numRooms,
        };
    }
}
