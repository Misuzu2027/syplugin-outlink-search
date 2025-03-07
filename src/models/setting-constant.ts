import { EnvConfig } from "@/config/EnvConfig";
import { ItemProperty, IOption, TabProperty } from "./setting-model";

export function getSettingTabArray(): TabProperty[] {

    let tabProperties: TabProperty[] = [

    ];

    tabProperties.push(
        new TabProperty({
            key: "fowardlink-panel-query-setting", name: "查询相关", iconKey: "iconFilter", props: [
                new ItemProperty({ key: "outlinkQueryDepth", type: "number", name: "查找深度", description: "文档嵌套引用查询的深度。", tips: "", min: 1, max: 9 }),
                new ItemProperty({ key: "enableCache", type: "switch", name: "开启缓存", description: "如果缓存的文档被更新，会自动删除缓存。", tips: "" }),
                new ItemProperty({ key: "defaultCrossBlockSearch", type: "switch", name: "默认使用跨块搜索", description: "", tips: "" }),
                new ItemProperty({ key: "includeQueryRelationTypes", type: "checkbox", name: "查询关联的类型", description: "", tips: "", options: getQueryRelationTypeElement() }),
                new ItemProperty({ key: "includeBlockTypes", type: "checkbox", name: "关键字匹配块类型", description: "", tips: "", options: getBlockTypeElement() }),
            ]

        }),

        new TabProperty({
            key: "fowardlink-panel-list-show-setting", name: "展示相关", iconKey: "iconFilter", props: [
                new ItemProperty({ key: "showCurDocument", type: "switch", name: "显示当前文档", description: "关闭后，如果当前文档被引用的档引用，还是会展示出来", tips: "", }),
                new ItemProperty({ key: "showDocumentBlock", type: "switch", name: EnvConfig.ins.i18n.displayDocBlock, description: "文档结果中显示文档块。", tips: "", }),
                new ItemProperty({ key: "maxExpandCount", type: "number", name: EnvConfig.ins.i18n.maxExpandCountName, description: EnvConfig.ins.i18n.maxExpandCountDesc, tips: "", min: 0 }),
                new ItemProperty({ key: "pageSize", type: "number", name: "页面大小", description: "", tips: "", min: 1 }),
                new ItemProperty({ key: "documentSortMode", type: "select", name: "文档排序方式", description: "", tips: "", options: getDocSortModeElement() }),
                new ItemProperty({ key: "contentBlockSortMethod", type: "select", name: "内容块排序方式", description: "", tips: "", options: getContentBlockSortModeElement() }),


            ]

        }),
        new TabProperty({
            key: "fowardlink-panel-other-setting", name: "其他", iconKey: "iconLink", props: [
                new ItemProperty({ key: "doubleClickTimeout", type: "number", name: EnvConfig.ins.i18n.doubleClickTimeThreshold, description: "", tips: "", min: 0 }),
                new ItemProperty({ key: "swapDocItemClickLogic", type: "switch", name: "双击展开/折叠文档", description: "", tips: "", }),
            ]

        }),

    );

    return tabProperties;
}


function getDocSortModeElement(): IOption[] {
    let docSortModeElements = SETTING_DOCUMENT_SORT_MODE_ELEMENT();
    let options: IOption[] = [];
    for (const element of docSortModeElements) {
        options.push(element);
    }

    return options;
}

function getContentBlockSortModeElement(): IOption[] {
    let contentBlockSortModeElements = SETTING_CONTENT_BLOCK_SORT_MODE_ELEMENT();
    let options: IOption[] = [];
    for (const element of contentBlockSortModeElements) {
        options.push(element);
    }

    return options;
}


function getQueryRelationTypeElement(): IOption[] {

    let options: IOption[] = [];
    options.push({
        name: "引用", value: "RefBlock", iconId: "#iconRefStyle"
    })
    options.push({
        name: "超链接", value: "Hyperlink", iconId: "#iconLink"
    })
    options.push({
        name: "数据库", value: "AttributeView", iconId: "#iconDatabase"
    })

    return options;
}




function getBlockTypeElement(): IOption[] {
    let blockTypeElements = SETTING_QUERY_BLOCK_TYPE_ELEMENT();
    let options: IOption[] = [];
    for (const element of blockTypeElements) {
        options.push(element);
    }

    return options;
}


export function SETTING_DOCUMENT_SORT_MODE_ELEMENT(): { name: string, value: DocumentSortMode }[] {
    return [
        // {
        //     name: EnvConfig.ins.i18n.sortByRankASC,
        //     value: "RankASC",

        // },
        // {
        //     name: EnvConfig.ins.i18n.sortByRankDESC,
        //     value: "RankDESC",
        // },
        {
            name: window.siyuan.languages.modifiedASC,
            value: "UpdatedASC",
        },
        {
            name: window.siyuan.languages.modifiedDESC,
            value: "UpdatedDESC",
        },
        {
            name: window.siyuan.languages.createdASC,
            value: "CreatedASC",
        },
        {
            name: window.siyuan.languages.createdDESC,
            value: "CreatedDESC",
        },
        {
            name: window.siyuan.languages.fileNameASC,
            value: "NameASC",
        },
        {
            name: window.siyuan.languages.fileNameDESC,
            value: "NameDESC",
        },
        {
            name: window.siyuan.languages.fileNameNatASC,
            value: "AlphanumASC",
        },
        {
            name: window.siyuan.languages.fileNameNatDESC,
            value: "AlphanumDESC",
        },
        {
            name: window.siyuan.languages.refCountASC,
            value: "RefCountASC",
        },
        {
            name: window.siyuan.languages.refCountDESC,
            value: "RefCountDESC",
        },

    ];
}


export function SETTING_CONTENT_BLOCK_SORT_MODE_ELEMENT(): { name: string, value: ContentBlockSortMode }[] {
    return [
        ...SETTING_DOCUMENT_SORT_MODE_ELEMENT(),
        {
            name: EnvConfig.ins.i18n.type,
            value: "Type",
        },
        {
            name: EnvConfig.ins.i18n.sortByContent,
            value: "Content",
        },
        {
            name: EnvConfig.ins.i18n.sortByTypeAndContent,
            value: "TypeAndContent",
        },
    ];
}

export function SETTING_QUERY_BLOCK_TYPE_ELEMENT(): { name: string, value: BlockType, iconId: string }[] {
    return [
        {
            name: window.siyuan.languages.math,
            value: "m",
            iconId: `#iconMath`,
        },
        {
            name: window.siyuan.languages.table,
            value: "t",
            iconId: `#iconTable`,
        },
        {
            name: window.siyuan.languages.paragraph,
            value: "p",
            iconId: `#iconParagraph`,
        },
        {
            name: window.siyuan.languages.headings,
            value: "h",
            iconId: `#iconHeadings`,
        },
        {
            name: window.siyuan.languages.code,
            value: "c",
            iconId: `#iconCode`,
        },
        {
            name: "HTML",
            value: "html",
            iconId: `#iconHTML5`,
        },
        {
            name: window.siyuan.languages.database,
            value: "av",
            iconId: `#iconDatabase`,
        },
        {
            name: window.siyuan.languages.embedBlock,
            value: "query_embed",
            iconId: `#iconSQL`,
        },
        {
            name: window.siyuan.languages.video,
            value: "video",
            iconId: `#iconVideo`,
        },
        {
            name: window.siyuan.languages.audio,
            value: "audio",
            iconId: `#iconRecord`,
        },
        {
            name: "IFrame",
            value: "iframe",
            iconId: `#iconLanguage`,
        },
        {
            name: window.siyuan.languages.widget,
            value: "widget",
            iconId: `#iconBoth`,
        },
        {
            name: window.siyuan.languages.quote,
            value: "b",
            iconId: `#iconQuote`,
        },
        {
            name: window.siyuan.languages.superBlock,
            value: "s",
            iconId: `#iconSuper`,
        },
        {
            name: window.siyuan.languages.list1,
            value: "l",
            iconId: `#iconList`,
        },
        {
            name: window.siyuan.languages.listItem,
            value: "i",
            iconId: `#iconListItem`,
        },
        {
            name: window.siyuan.languages.doc,
            value: "d",
            iconId: `#iconFile`,
        },
    ];
}