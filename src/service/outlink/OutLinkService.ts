import Instance from "@/utils/Instance";
import { generateCrossBlockQueryByKeywordAndRootIdSql, generateGetOutLinkBlockIdArraySql, generateQueryBlocksWithDocsByIdsSql, generateQueryByKeywordAndRootIdSql } from "./outlink-sql";
import { isSetEmpty } from "@/utils/array-util";
import { extractHyperlinkBlockIds, getFileArialLabel, getRefBlockId, highlightBlockContent } from "@/utils/siyuan-util";
import { isStrBlank, isStrNotBlank, splitKeywordStringToArray } from "@/utils/string-util";
import { getAttributeViewPrimaryKeyValues, getBlockIndex, getBlocksIndexes, sql } from "@/utils/api";
import { stringToDom } from "@/utils/html-util";
import { BlockItem, BlockQueryCriteria, DocumentItem } from "@/models/outlink-model";
import { EnvConfig } from "@/config/EnvConfig";
import { getDocIconHtmlByIal } from "@/utils/icon-util";
import { SettingService } from "../setting/SettingService";
import { isArrayEmpty } from '../../utils/array-util';
import { CacheManager } from "@/config/CacheManager";


export class OutLinkDataService {

    public static get ins(): OutLinkDataService {
        return Instance.get(OutLinkDataService);
    }

    public async getDocmuentOutLinkByDepth(rootIdParam: string, queryDepth: number): Promise<Set<string>> {
        queryDepth = Math.max(queryDepth, 1);
        queryDepth = Math.min(queryDepth, 9);
        let SettingConfig = SettingService.ins.SettingConfig;

        let includeRelationTypes = SettingConfig.includeQueryRelationTypes;
        let enableCache = SettingConfig.enableCache;

        let isQueryRefBlock = includeRelationTypes.includes("RefBlock");
        let isQueryHyperlink = includeRelationTypes.includes("Hyperlink");
        let isQueryAttributeView = includeRelationTypes.includes("AttributeView");

        let nextRootIdSet: Set<string> = new Set([rootIdParam]);
        let allLinkIdSet: Set<string> = new Set([rootIdParam]);

        for (let index = 0; index < queryDepth; index++) {
            if (isSetEmpty(nextRootIdSet)) {
                break;
            }
            // 缓存中的Root下的LinkId
            let cacheRootLinkIdSet: Set<string> = new Set();
            let sqlRootIdSet: Set<string> = new Set();

            for (const rootId of nextRootIdSet) {

                // 首先查看是否能命中缓存
                let linkIdCacheSet = CacheManager.ins.getRootFowardlinkIdSet(rootId);
                // 不需要判断 set 的大小，因为如果查询为空也会保存在缓存中，防止缓存击穿。
                if (linkIdCacheSet) {
                    linkIdCacheSet.forEach(linkId => { cacheRootLinkIdSet.add(linkId); });
                } else {
                    sqlRootIdSet.add(rootId)
                    // 给所有数据库查询的 rootId 预先添加缓存，如果有结果再添加结果，没有就是空数组。
                    if (enableCache) {
                        CacheManager.ins.setAddRootFowardlinkIdSet(rootId, null, new Set(), 5000)
                    }
                }
            }


            nextRootIdSet.clear();
            // console.log("cacheRootLinkIdSet ", cacheRootLinkIdSet)
            // console.log("sqlRootIdSet ", sqlRootIdSet)
            // 遍历缓存中查询出来的下一轮RootId
            cacheRootLinkIdSet.forEach(linkId => {
                if (!allLinkIdSet.has(linkId)) {
                    nextRootIdSet.add(linkId);
                    allLinkIdSet.add(linkId);
                }
            })

            if (isSetEmpty(sqlRootIdSet)) {
                continue;
            }

            let getOutLinkBlockIdArraySql
                = generateGetOutLinkBlockIdArraySql({ idArray: Array.from(sqlRootIdSet), isQueryRefBlock, isQueryHyperlink, isQueryAttributeView });
            let linkBlockArray = await sql(getOutLinkBlockIdArraySql);

            for (const linkBlock of linkBlockArray) {
                let linkIdCacheSet: Set<string> = new Set();
                if (linkBlock.type == "av") {
                    let avId = stringToDom(linkBlock.markdown).getAttribute("data-av-id");
                    let avResponse = await getAttributeViewPrimaryKeyValues(avId, 1, 999999999, null);
                    if (!avResponse || !avResponse.rows.values) {
                        continue
                    }

                    let avPkValues = avResponse.rows.values as IAVCellValue[];
                    for (const cell of avPkValues) {
                        if (cell.isDetached) {
                            continue;
                        }
                        let linkId = cell.blockID;
                        linkIdCacheSet.add(linkId);
                        if (!allLinkIdSet.has(linkId)) {
                            nextRootIdSet.add(linkId)
                            allLinkIdSet.add(linkId);
                        }
                    }
                } else {
                    let refLinkIds = getRefBlockId(linkBlock.markdown);
                    let hyperLinkIds = extractHyperlinkBlockIds(linkBlock.markdown);
                    let linkIds = [...refLinkIds, ...hyperLinkIds];

                    for (const linkId of linkIds) {
                        if (isStrNotBlank(linkId)) {
                            linkIdCacheSet.add(linkId);
                            if (!allLinkIdSet.has(linkId)) {
                                nextRootIdSet.add(linkId)
                                allLinkIdSet.add(linkId);
                            }
                        }
                    }
                }

                if (enableCache) {
                    let rootId = linkBlock.rootId;
                    let tempRootId = linkBlock.tempRootId;
                    if (isStrNotBlank(rootId)) {
                        CacheManager.ins.setAddRootFowardlinkIdSet(rootId, null, linkIdCacheSet, 5000)
                    }
                    if (isStrNotBlank(tempRootId)) {
                        CacheManager.ins.setAddRootFowardlinkIdSet(rootId, tempRootId, linkIdCacheSet, 5000)
                    }
                }
            }
        }
        if (!SettingConfig.showCurDocument) {
            allLinkIdSet.delete(rootIdParam);
        }

        return allLinkIdSet;
    }

    public getFowardlinkQueryCriteria(
        rootIdArray: string[],
        keywordStr: string,
        crossBlockSearch: boolean,
        pageNum: number,
        documentSortMode: DocumentSortMode) {
        let keywordsObj = parseSearchSyntax(keywordStr);
        let SettingConfig = SettingService.ins.SettingConfig;
        let pageSize = SettingConfig.pageSize;

        if (isStrBlank(documentSortMode)) {
            documentSortMode = SettingConfig.documentSortMode;
        }

        let queryCriteria: BlockQueryCriteria = {
            includeKeywords: keywordsObj.includeKeywords,
            excludeKeywords: keywordsObj.excludeKeywords,
            crossBlocktSearch: crossBlockSearch,
            pages: [pageNum, pageSize],
            documentSortMode: documentSortMode,
            contentBlockSortMethod: SettingConfig.contentBlockSortMethod,
            includeConcatFields: SettingConfig.includeConcatFields,

            includeBlockTypes: SettingConfig.includeBlockTypes,
            includeRootIds: rootIdArray
        };
        return queryCriteria;
    }

    public async getDocumentItemArray(queryCriteria: BlockQueryCriteria): Promise<DocumentItem[]> {
        if (!queryCriteria || isArrayEmpty(queryCriteria.includeRootIds)) {
            return [];
        }

        let noKeywordQuery = isArrayEmpty(queryCriteria.includeKeywords) && isArrayEmpty(queryCriteria.excludeKeywords);
        // 全文搜索
        let crossBlockSearch = queryCriteria.crossBlocktSearch;
        let querySql = "";
        if (noKeywordQuery) {
            querySql = generateQueryBlocksWithDocsByIdsSql(queryCriteria);
        } else {
            if (crossBlockSearch) {
                querySql = generateCrossBlockQueryByKeywordAndRootIdSql(queryCriteria);
            } else {
                querySql = generateQueryByKeywordAndRootIdSql(queryCriteria);
            }
        }

        let linkBlockArray: Block[] = await sql(querySql);

        let allDocItemArray: DocumentItem[] = await processBlockToDocItem(
            linkBlockArray,
            queryCriteria,
        );


        return allDocItemArray;

    }

    public async getPageDocumentItemArray(allDocItemArray: DocumentItem[], pageNum: number): Promise<DocumentItem[]> {
        if (isArrayEmpty(allDocItemArray)) {
            return [];
        }
        let pageResult: DocumentItem[] = [];
        let SettingConfig = SettingService.ins.SettingConfig;

        let contentBlockSortMethod = SettingConfig.contentBlockSortMethod;
        let pageSize = SettingConfig.pageSize;
        let start = (pageNum - 1) * pageSize;
        let end = pageNum * pageSize;

        for (let docIndex = 0; docIndex < allDocItemArray.length; docIndex++) {
            if (docIndex < start) {
                continue;
            }
            if (docIndex >= end) {
                break;
            }
            let documentItem = allDocItemArray[docIndex];

            pageResult.push(documentItem);
        }

        let itemIndex = 0;

        for (let docIndex = 0; docIndex < pageResult.length; docIndex++) {
            let documentItem = pageResult[docIndex];
            // 是否隐藏文档快
            if (!SettingConfig.showDocumentBlock) {
                if (documentItem.subItems.length > 1) {
                    let documentItemIndex = 0;
                    for (let i: number = 0; i < documentItem.subItems.length; i++) {
                        let subItem = documentItem.subItems[i];
                        if (subItem.block.type === "d") {
                            documentItemIndex = i;
                            break;
                        }
                    }
                    documentItem.subItems.splice(documentItemIndex, 1);
                }
            }
            await blockItemsSort(documentItem.subItems, contentBlockSortMethod, documentItem.index);
            documentItem.index = itemIndex;
            for (const subItem of documentItem.subItems) {
                if (documentItem.block.id !== subItem.block.id) {
                    itemIndex++;
                }
                subItem.index = itemIndex;
            }

            itemIndex++;
        }
        return pageResult;
    }




}

function parseSearchSyntax(query: string): {
    includeKeywords: string[],
    excludeKeywords: string[],
} {
    const includeKeywords: string[] = [];
    const excludeKeywords: string[] = [];

    // 按空格拆分查询字符串
    const terms = splitKeywordStringToArray(query);

    for (const term of terms) {
        if (term.startsWith("-")) {
            // 以 `-` 开头的排除普通文本
            excludeKeywords.push(term.slice(1));
        } else {
            // 普通文本包含项
            includeKeywords.push(term);
        }
    }

    return { includeKeywords, excludeKeywords };
}



export async function processBlockToDocItem(
    blocks: Block[],
    queryCriteria: BlockQueryCriteria
): Promise<DocumentItem[]> {

    let allDocItemArray: DocumentItem[] = [];
    if (!blocks) {
        blocks = [];
        return allDocItemArray;
    }
    let includeKeywords = queryCriteria.includeKeywords;
    let documentSortMode = queryCriteria.documentSortMode;
    let notebookMap = EnvConfig.ins.notebookMap;

    let SettingConfig = SettingService.ins.SettingConfig;

    const documentBlockMap: Map<string, DocumentItem> =
        new Map();
    const blockIdSet: Set<string> = new Set();


    for (const block of blocks) {
        if (!block || !block.id || blockIdSet.has(block.id)) {
            continue;
        }
        blockIdSet.add(block.id);

        highlightBlockContent(block, includeKeywords);

        let rootId = block.root_id;
        let blockItem = new BlockItem();
        blockItem.block = block;

        let tempParentItem: DocumentItem = null;
        if (documentBlockMap.has(rootId)) {
            tempParentItem = documentBlockMap.get(rootId);
        } else {
            tempParentItem = new DocumentItem();
            tempParentItem.subItems = [];
            documentBlockMap.set(rootId, tempParentItem);
        }

        tempParentItem.subItems.push(blockItem);
        if (block.type == "d") {
            let documentItem = new DocumentItem();
            documentItem.block = block;
            documentItem.subItems = [];

            let subItems = tempParentItem.subItems;
            if (subItems) {
                // 让文档块始终在第一个。
                let documentBlockItem = subItems.pop()
                subItems.unshift(documentBlockItem);
                documentItem.subItems = subItems;
            }

            if (blocks.length > SettingConfig.maxExpandCount) {
                documentItem.isCollapsed = true;
            } else {
                documentItem.isCollapsed = false;
            }
            documentItem.icon = getDocIconHtmlByIal(block.ial, null, null);

            let notebookInfo = notebookMap.get(block.box);
            let boxName = block.box;
            if (notebookInfo) {
                boxName = notebookInfo.name;
            }

            documentItem.ariaLabel = getFileArialLabel(block, boxName);
            allDocItemArray.push(documentItem);
            documentBlockMap.set(rootId, documentItem);
        }
    }

    if (allDocItemArray.length == 1) {
        allDocItemArray[0].isCollapsed = false;
    }

    // 文档排序
    documentSort(allDocItemArray, documentSortMode);



    return allDocItemArray;
}







function documentSort(docItemArray: DocumentItem[], documentSortMode: DocumentSortMode) {
    // 文档排序
    let documentSortFun = getDocumentSortFun(documentSortMode);
    docItemArray.sort(documentSortFun);
}

function getDocumentSortFun(documentSortMode: DocumentSortMode)
    : (
        a: DocumentItem,
        b: DocumentItem,
    ) => number {
    let documentSortFun: (
        a: DocumentItem,
        b: DocumentItem,
    ) => number;

    switch (documentSortMode) {
        case "UpdatedASC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(a.block.updated) - Number(b.block.updated);
            };
            break;
        case "UpdatedDESC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(b.block.updated) - Number(a.block.updated);
            };
            break;
        case "CreatedASC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(a.block.created) - Number(b.block.created);
            };
            break;
        case "CreatedDESC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                return Number(b.block.created) - Number(a.block.created);
            };
            break;
        case "RankASC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = aRank - bRank;
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "RankDESC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = bRank - aRank;
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "AlphanumASC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = aContent.localeCompare(bContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "AlphanumDESC":
            documentSortFun = function (
                a: DocumentItem,
                b: DocumentItem,
            ): number {
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = bContent.localeCompare(aContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
    }
    return documentSortFun;
}


export async function blockItemsSort(
    blockItems: BlockItem[],
    contentBlockSortMethod: ContentBlockSortMode,
    startIndex: number,) {
    if (!blockItems || blockItems.length <= 1) {
        return;
    }
    if (contentBlockSortMethod == "Content") {
        await searchItemSortByContent(blockItems);
    } else if (contentBlockSortMethod == "TypeAndContent") {
        await searchItemSortByTypeAndContent(blockItems);
    } else {
        let blockSortFun: (
            a: BlockItem,
            b: BlockItem,
        ) => number = getBlockSortFun(contentBlockSortMethod);
        if (blockSortFun) {
            blockItems.sort(blockSortFun);
        }
    }
    // 排序后再处理一下搜索结果中的索引，用来上下键选择。
    let index = startIndex;
    if (blockItems[0].block.type != "d") {
        index++;
    }
    for (const item of blockItems) {
        item.index = index;
        index++;
    }
}

function getBlockSortFun(contentBlockSortMethod: ContentBlockSortMode) {
    let blockSortFun: (
        a: BlockItem,
        b: BlockItem,
    ) => number;
    switch (contentBlockSortMethod) {
        case "Type":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let result = a.block.sort - b.block.sort;
                if (result == 0) {
                    let aRank: number = calculateBlockRank(a.block);
                    let bRank: number = calculateBlockRank(b.block);
                    result = bRank - aRank;
                }
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }

                return result;
            };
            break;
        case "UpdatedASC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(a.block.updated) - Number(b.block.updated);
            };
            break;
        case "UpdatedDESC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(b.block.updated) - Number(a.block.updated);
            };
            break;
        case "CreatedASC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(a.block.created) - Number(b.block.created);
            };
            break;
        case "CreatedDESC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                return Number(b.block.created) - Number(a.block.created);
            };
            break;
        case "RankASC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = aRank - bRank;
                if (result == 0) {
                    result = Number(a.block.sort) - Number(b.block.sort);
                    if (result == 0) {
                        result = Number(b.block.updated) - Number(a.block.updated);
                    }
                }
                return result;
            };
            break;
        case "RankDESC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aRank: number = calculateBlockRank(a.block);
                let bRank: number = calculateBlockRank(b.block);
                let result = bRank - aRank;
                if (result == 0) {
                    result = Number(a.block.sort) - Number(b.block.sort);
                    if (result == 0) {
                        result = Number(b.block.updated) - Number(a.block.updated);
                    }
                }
                return result;
            };
            break;
        case "AlphanumASC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = aContent.localeCompare(bContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
        case "AlphanumDESC":
            blockSortFun = function (
                a: BlockItem,
                b: BlockItem,
            ): number {
                if (a.block.type === "d") {
                    return -1;
                }
                if (b.block.type === "d") {
                    return 1;
                }
                let aContent = a.block.content.replace("<mark>", "").replace("</mark>", "");
                let bContent = b.block.content.replace("<mark>", "").replace("</mark>", "");
                let result = bContent.localeCompare(aContent, undefined, { sensitivity: 'base', usage: 'sort', numeric: true });
                if (result == 0) {
                    result = Number(b.block.updated) - Number(a.block.updated);
                }
                return result;
            };
            break;
    }
    return blockSortFun;

}


function calculateBlockRank(block: Block): number {
    let SettingConfig = SettingService.ins.SettingConfig;
    let includeConcatFields = SettingConfig.includeConcatFields;
    let rank = block.content.split("<mark>").length - 1;

    if (includeConcatFields.includes("name")) {
        rank += block.name.split("<mark>").length - 1;
    }
    if (includeConcatFields.includes("alias")) {
        rank += block.alias.split("<mark>").length - 1;
    }
    if (includeConcatFields.includes("memo")) {
        rank += block.memo.split("<mark>").length - 1;
    }
    return rank;
}


async function searchItemSortByContent(blockItems: BlockItem[]) {

    let ids = blockItems.map(item => item.block.id);
    let idMap: Map<BlockId, number> = await getBatchBlockIdIndex(ids);
    blockItems.sort((a, b) => {
        if (a.block.type === "d") {
            return -1;
        }
        if (b.block.type === "d") {
            return 1;
        }
        let aIndex = idMap.get(a.block.id) || 0;
        let bIndex = idMap.get(b.block.id) || 0;
        let result = aIndex - bIndex;
        if (result == 0) {
            result = Number(a.block.created) - Number(b.block.created);
        }
        if (result == 0) {
            result = a.block.sort - b.block.sort;
        }
        return result;
    });

    return blockItems;
}


async function searchItemSortByTypeAndContent(blockItems: BlockItem[]) {
    let ids = blockItems.map(item => item.block.id);
    let idMap: Map<BlockId, number> = await getBatchBlockIdIndex(ids);
    blockItems.sort((a, b) => {
        if (a.block.type === "d") {
            return -1;
        }
        if (b.block.type === "d") {
            return 1;
        }
        let result = a.block.sort - b.block.sort;
        if (result == 0) {
            let aIndex = idMap.get(a.block.id) || 0;
            let bIndex = idMap.get(b.block.id) || 0;
            result = aIndex - bIndex;
        }
        if (result == 0) {
            result = Number(a.block.created) - Number(b.block.created);
        }
        return result;
    });

    return blockItems;
}


async function getBatchBlockIdIndex(ids: string[]): Promise<Map<BlockId, number>> {
    let idMap: Map<string, number> = new Map();
    let getSuccess = true;
    try {
        let idObject = await getBlocksIndexes(ids);
        // 遍历对象的键值对，并将它们添加到 Map 中
        for (const key in idObject) {
            if (Object.prototype.hasOwnProperty.call(idObject, key)) {
                const value = idObject[key];
                idMap.set(key, value);
            }
        }
    } catch (err) {
        getSuccess = false;
        console.error("批量获取块索引报错，可能是旧版本不支持批量接口 : ", err)
    }

    if (!getSuccess) {
        for (const id of ids) {
            let index = 0
            try {
                index = await getBlockIndex(id);
            } catch (err) {
                console.error("获取块索引报错 : ", err)
            }
            idMap.set(id, index)
        }
    }

    return idMap;
}