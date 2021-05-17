import {InsightDataset} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import {ITestQuery} from "./InsightFacade.spec";
import TestUtil from "./TestUtil";

export default class Helper {
    public static addTwoDatasets(
        loadedDatasets: {[id: string]: string},
        insightFacade: InsightFacade,
        ds: InsightDataset,
        ds2: InsightDataset): Promise<string[]> {
        return insightFacade.addDataset(ds.id, loadedDatasets[ds.id], ds.kind)
            .then(() => {
                return insightFacade.addDataset(ds2.id, loadedDatasets[ds2.id], ds2.kind);
            });
    }

    public static addRemoveDatasets(
        loadedDatasets: {[id: string]: string},
        insightFacade: InsightFacade,
        ds: InsightDataset,
        rm: InsightDataset): Promise<string> {
        return insightFacade.addDataset(ds.id, loadedDatasets[ds.id], ds.kind)
            .then(() => {
                return insightFacade.removeDataset(rm.id);
            });
    }

    public static addDatasetAndListDataset(
        loadedDatasets: {[id: string]: string},
        insightFacade: InsightFacade,
        ds: InsightDataset): Promise<InsightDataset[]> {
        return insightFacade.addDataset(ds.id, loadedDatasets[ds.id], ds.kind)
            .then(() => {
                return insightFacade.listDatasets();
            });
    }

    public static addTwoDatasetsAndListDatasets(
        loadedDatasets: {[id: string]: string},
        insightFacade: InsightFacade,
        ds: InsightDataset,
        ds2: InsightDataset): Promise<InsightDataset[]> {
        return Helper.addTwoDatasets(loadedDatasets, insightFacade, ds, ds2).then(() => {
            return insightFacade.listDatasets();
        });
    }

    public static addTwoDatasetsRemoveOneThenList(
        loadedDatasets: {[id: string]: string},
        insightFacade: InsightFacade,
        ds: InsightDataset,
        ds2: InsightDataset,
        rm: InsightDataset): Promise<InsightDataset[]> {
        return Helper.addTwoDatasets(loadedDatasets, insightFacade, ds, ds2).then(() => {
            return insightFacade.removeDataset(rm.id);
        }).then(() => {
            return insightFacade.listDatasets();
        });
    }

    public static addDatasetAndRemoveTwice(
        loadedDatasets: {[id: string]: string},
        insightFacade: InsightFacade,
        ds: InsightDataset,
        rm: InsightDataset,
        rm2: InsightDataset): Promise<string> {
        return Helper.addRemoveDatasets(loadedDatasets, insightFacade, ds, rm).then(() => {
            return insightFacade.removeDataset(rm2.id);
        });
    }

    public static allPromisesFulfilled(promisesList: Array<Promise<string[]>>) {
        return Promise.all(promisesList).then(() => {
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    }

    public static performTestQuery(testQueries: ITestQuery[], insightFacade: InsightFacade) {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            // let insightFacade: InsightFacade = new InsightFacade();
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
                    TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    }
}
