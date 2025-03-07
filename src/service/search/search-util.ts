
import { DocumentItem } from "@/models/outlink-model";
import { SETTING_CONTENT_BLOCK_SORT_MODE_ELEMENT } from "@/models/setting-constant";
import { isArrayEmpty, isArrayNotEmpty } from "@/utils/array-util";
import { isStrNotBlank } from "@/utils/string-util";




function removeLastPathSegment(path: string): string {
    // 使用最后一个斜杠将路径分割成数组
    const segments = path.split('/');

    // 如果数组长度小于等于1，返回原路径
    if (segments.length <= 1) {
        return "/";
    }

    // 去掉最后一个路径部分并重新组合路径
    segments.pop(); // 移除最后一个部分
    return segments.join('/'); // 重新组合路径
}


function findShortestPaths(paths: Set<string>): Set<string> {
    // 创建一个 Map 用于存储以每个路径的开头部分作为键，路径数组作为值
    const pathMap = new Map<string, string[]>();

    paths.forEach(path => {
        // 以路径的第一部分（根节点）作为键
        const root = path.split('/')[0];  // 取第一个 id 节点
        if (!pathMap.has(root)) {
            pathMap.set(root, []);
        }
        pathMap.get(root)!.push(path);
    });

    // 遍历 Map，找到每组中最短的路径
    const shortestPaths: Set<string> = new Set<string>();
    pathMap.forEach((groupedPaths, root) => {
        const shortestPath = groupedPaths.reduce((shortest, current) =>
            current.length < shortest.length ? current : shortest
        );
        shortestPaths.add(shortestPath);
    });

    return shortestPaths;
}



export function isQueryDocByPathApi(
    showSubDocuments: boolean,
    notebookId: string,
    docPath: string,
    keywords: string[],
    fullTextSearch: boolean,
): boolean {
    // return false;
    // 满足以下情况使用路径查询子文档
    //  不查询子文档的子文档
    //  notebookId 和 docPath 不为空
    //  （关键字为空 或 不使用全文搜索）
    return (
        !showSubDocuments &&
        isStrNotBlank(notebookId) &&
        isStrNotBlank(docPath) &&
        (isArrayEmpty(keywords) || !fullTextSearch)
    );
}

export function selectItemByArrowKeys(
    event: KeyboardEvent,
    selectedItemIndex: number,
    documentItems: DocumentItem[],
): DocumentItem {
    let selectedItem: DocumentItem = null;

    if (!event || !event.key) {
        return selectedItem;
    }
    let keydownKey = event.key;
    if (
        keydownKey !== "ArrowUp" &&
        keydownKey !== "ArrowDown" &&
        keydownKey !== "Enter"
    ) {
        return selectedItem;
    }
    if (selectedItemIndex == null || selectedItemIndex == undefined) {
        selectedItemIndex = 0;
    }

    event.stopPropagation();

    if (event.key === "ArrowUp") {
        if (selectedItemIndex > 0) {
            selectedItemIndex -= 1;
        }
    } else if (event.key === "ArrowDown") {
        let lastDocumentItem = documentItems[documentItems.length - 1];
        if (!lastDocumentItem) {
            return selectedItem;
        }
        let lastIndex = lastDocumentItem.index;
        if (selectedItemIndex < lastIndex) {
            selectedItemIndex += 1;
        }
    }
    for (const item of documentItems) {
        if (selectedItemIndex == item.index) {
            selectedItem = item;
            break;
        }
    }

    return selectedItem;
}



export function toggleAllCollpsedItem(documentItems: DocumentItem[], isCollapsed: boolean) {
    if (!documentItems) {
        return;
    }
    for (const item of documentItems) {
        if (
            !item ||
            !item.block ||
            !item.subItems ||
            item.subItems.length <= 0
        ) {
            continue;
        }
        item.isCollapsed = isCollapsed;
    }
    documentItems = documentItems;
}

// 查找包含指定元素的最近的滚动容器
export function findScrollingElement(element: HTMLElement): HTMLElement | null {
    let parentElement = element.parentElement;
    while (parentElement) {
        if (parentElement.scrollHeight > parentElement.clientHeight) {
            return parentElement; // 找到第一个具有滚动条的父级元素
        }
        parentElement = parentElement.parentElement;
    }
    return null; // 没有找到具有滚动条的父级元素
}


export function getRangeByElement(element: Element): Range {
    if (!element) {
        return;
    }
    let elementRange = document.createRange();
    elementRange.selectNodeContents(element);
    return elementRange;
}


export const blockSortSubMenu = (documentItem: DocumentItem, sortCallback: Function) => {

    let menus = [];
    for (const sortMethodObj of SETTING_CONTENT_BLOCK_SORT_MODE_ELEMENT()) {
        menus.push({
            label: sortMethodObj.name,
            click: () => {
                sortCallback(documentItem, sortMethodObj.value)
            }
        })
    }
    return menus;

};
