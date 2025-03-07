
type BlockSortMethod =
    | "type"
    | "content"
    | "typeAndContent"
    | "modifiedAsc"
    | "modifiedDesc"
    | "createdAsc"
    | "createdDesc"
    | "rankAsc"
    | "rankDesc"
    | "refCountAsc"
    | "refCountDesc"
    | "alphabeticAsc"
    | "alphabeticDesc"
    | "documentAlphabeticAsc"
    | "documentAlphabeticDesc"
    ;





type IItemPropertyType =
    "select" |
    "text" |
    "number" |
    "button" |
    "textarea" |
    "switch" |
    "order" |
    "tips" |
    "checkbox";


type RelationType =
    | "RefBlock"
    | "Hyperlink"
    | "AttributeView"
    ;


type DocumentSortMode =
    | "RankASC"
    | "RankDESC"
    | "NameASC"
    | "NameDESC"
    | "UpdatedASC"
    | "UpdatedDESC"
    | "AlphanumASC"
    | "AlphanumDESC"
    | "RefCountASC"
    | "RefCountDESC"
    | "CreatedASC"
    | "CreatedDESC"
    ;
type ContentBlockSortMode =
    | "Type"
    | "Content"
    | "TypeAndContent"
    | DocumentSortMode
    ;
