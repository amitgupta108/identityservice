import { open } from 'lmdb';
import { SystemService } from "./service.mjs";
import store from '../../../data/data.json' with { type: 'json' };

class PersistenceService extends SystemService {
    constructor(name) {
        super(name);
        this.ids = store.ids;
        this.expiries = store.expiries;
    }

    init() {
        //this.store = open(process.env.workspace_location + '/' + process.env.store_location, {});
        this.initialized = true;
        return { status: 'success' };
    }

    get(key) {
        return this.store.get(key);
    }

    async set(key, value) {
        return await this.store.put(key, value);
    }

    getId(key) 
    {
        const app = this.ids[key];
        const appClone = structuredClone(app);
        const stockCode = appClone.stockCode;
        if (appClone.mode !== 'HISTORY') {
            appClone.fExpiry = this.expiries[stockCode]['futures']['FIRST'];
            for (const [i, e] of appClone.oExpiries.entries()) {
                appClone.oExpiries[i] = this.expiries[stockCode]['options'][e];
            }
        }
        else
            appClone.simStartTime = new Date(app.simStartTime).getTime();

        return appClone;
    }
}

export const persistenceservice = new PersistenceService('PERSISTSERVICE');