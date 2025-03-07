import { isStrNotBlank } from "@/utils/string-util";


export class SettingConfig {


    /* 查询相关 */

    // 默认查找深度
    outlinkQueryDepth: number;
    // 使用缓存
    enableCache: boolean;
    // 默认跨块搜索
    defaultCrossBlockSearch: boolean;
    // 查询的引用类型
    includeQueryRelationTypes: RelationType[];
    // 查询的块类型
    includeBlockTypes: BlockType[];


    /* 展示相关 */
    // 显示当前文档（如果当前文档被子文档引用，还是会展示出来）
    showCurDocument: boolean;
    // 显示文档块
    showDocumentBlock: boolean;
    // 最大展开数量，查询结果超过这个数量会自动折叠
    maxExpandCount: number;
    // 每页文档数量
    pageSize: number;
    // 文档排序方式
    documentSortMode: DocumentSortMode;
    // 内容块排序方式
    contentBlockSortMethod: ContentBlockSortMode;


    /* 其他 */

    // 双击阈值
    doubleClickTimeout: number;
    // 改为双击切换笔记本的折叠展开
    swapDocItemClickLogic: boolean;


    // 数据库查询相关，暂不支持设置
    includeConcatFields: string[];
    // 刷新预览区高亮延迟，太短可能会高亮失败，不需要可以设置为0。 没有预览区
    refreshPreviewHighlightTimeout: number;
    // Dock 位置（目前用于是否显示）
    dockPosition: DockPosition;
}


interface ITabProperty {
    key: string;
    name: string;
    props: Array<ItemProperty>;
    iconKey?: string;
}


export class TabProperty {
    key: string;
    name: string;
    iconKey: string;
    props: ItemProperty[];

    constructor({ key, name, iconKey, props }: ITabProperty) {
        this.key = key;
        this.name = name;
        if (isStrNotBlank(iconKey)) {
            this.iconKey = iconKey;
        } else {
            this.iconKey = "setting";
        }
        this.props = props;

    }

}

export interface IOption {
    name: string;
    desc?: string;
    value: string;
    iconId?: string;
    type?: string;
}




export class ItemProperty {
    key: string;
    type: IItemPropertyType;
    name: string;
    description: string;
    tips?: string;

    min?: number;
    max?: number;
    btndo?: () => void;
    options?: IOption[];
    afterUpdateCallback?: (key, value) => void;


    constructor({ key, type, name, description, tips, min, max, btndo, options, afterUpdateCallback }: ItemProperty) {
        this.key = key;
        this.type = type;
        this.min = min;
        this.max = max;
        this.btndo = btndo;
        this.options = options ?? [];
        this.name = name;
        this.description = description;
        this.tips = tips;
        this.afterUpdateCallback = afterUpdateCallback;
    }

}

