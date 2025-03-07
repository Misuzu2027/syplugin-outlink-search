

export interface BlockQueryCriteria {
    includeKeywords: string[];
    excludeKeywords: string[];
    crossBlocktSearch: boolean;
    pages: number[];
    documentSortMode: DocumentSortMode;
    contentBlockSortMethod: ContentBlockSortMode;
    includeConcatFields: string[];
    includeBlockTypes: string[];
    includeRootIds: string[]; // 这个不一定是文档ID。
}

export class DocumentItem {
    block: Block;
    subItems: BlockItem[];
    isCollapsed: boolean;
    icon: string;
    index: number;
    path: string;
    ariaLabel: string;
}

export class BlockItem {
    block: Block;
    icon: string;
    index: number;
}
