import { Cache, generateKey } from "@/models/cache-model";
import Instance from "@/utils/Instance";
import { EnvConfig } from "./EnvConfig";
import { isArrayEmpty } from "@/utils/array-util";
import { isStrBlank, isStrNotBlank } from "@/utils/string-util";

export class CacheManager {
    public static get ins(): CacheManager {
        return Instance.get(CacheManager);
    }

    private rootFowardlinkIdSetCache: Cache = new Cache();

    // 毫秒
    private dayTtl: number = 24 * 60 * 60 * 1000;

    public setAddRootFowardlinkIdSet(
        rootId: string,
        focusBlockId: string,
        value: Set<string>,
        ttlSeconds: number
    ) {
        let key = generateKey(rootId, focusBlockId);
        let linkIdSet = this.getRootFowardlinkIdSet(key);
        if (linkIdSet) {
            value.forEach((linkId) => {
                linkIdSet.add(linkId);
            });
        } else {
            this.rootFowardlinkIdSetCache.set(key, value, ttlSeconds * 1000);
        }
    }
    public setRootFowardlinkIdSet(
        rootId: string,
        value: Set<string>,
        ttlSeconds: number
    ) {
        this.rootFowardlinkIdSetCache.set(rootId, value, ttlSeconds * 1000);
    }
    public getRootFowardlinkIdSet(rootId: string): Set<string> {
        return this.rootFowardlinkIdSetCache.getBySuffix(rootId);
    }
    public deleteRootFowardlinkIdSet(rootId: string) {
        this.rootFowardlinkIdSetCache.deleteByPrefix(rootId);
    }
    public clearRootFowardlinkIdSet() {
        this.rootFowardlinkIdSetCache.cleanAll();
    }

    public initSiyuanEventBus() {
        // console.log("initSiyuanEventBus");
        EnvConfig.ins.plugin.eventBus.on("ws-main", wsMainHandleri);
    }

    public destorySiyuanEventBus() {
        // console.log("destorySiyuanEventBus");
        EnvConfig.ins.plugin.eventBus.off("ws-main", wsMainHandleri);
    }
}

function wsMainHandleri(e: any) {
    if (!e || !e.detail) {
        return;
    }
    let detail = e.detail;
    // console.log("wsMainHandleri detail ", detail)

    switch (detail.cmd) {
        case "savedoc":
            let rootId = detail.data.rootID;
            if (isStrNotBlank(rootId)) {
                CacheManager.ins.deleteRootFowardlinkIdSet(rootId);
            }
            let operations = detail.data.sources as any[];
            if (isArrayEmpty(operations)) {
                break;
            }
            for (const op of operations) {
                if (!op || isArrayEmpty(op.doOperations)) {
                    continue;
                }
                for (const doOp of op.doOperations) {
                    if (!doOp || isStrBlank(doOp.id)) {
                        continue;
                    }
                    CacheManager.ins.deleteRootFowardlinkIdSet(doOp.id);
                }
            }
            break;
    }
}
