import { BlockQueryCriteria } from "@/models/outlink-model";
import { isArrayEmpty, isArrayNotEmpty } from "@/utils/array-util";
import { isStrNotBlank } from "@/utils/string-util";



/**
 * 查询指定块下面的所有定义块
 * @param queryParams 
 * @returns 
 */
export function generateGetOutLinkBlockIdArraySql(paramObj: {
    idArray: string[], isQueryRefBlock: boolean, isQueryHyperlink: boolean, isQueryAttributeView: boolean
}
): string {
    let idArray = paramObj.idArray;

    let idsValuesSql = generateValuesRow(idArray);

    let rescursiveTableSql = `
WITH RECURSIVE idsTb(id) AS (
    VALUES ${idsValuesSql}
),
blockTreeTb AS (
		SELECT id AS temp_root_id, *
		FROM blocks
		WHERE id != root_id AND id IN ( SELECT id FROM idsTb )
		UNION ALL
		SELECT blockTreeTb.temp_root_id, t.*
		FROM blocks t
			INNER JOIN blockTreeTb ON t.parent_id = blockTreeTb.id
) 
    `;
    let selectUnionSql = '';

    //     if (paramObj.isQueryRefBlock) {
    //         selectUnionSql += `
    // SELECT
    // 	blockTreeTb.temp_root_id AS tempRootId,
    // 	refs.root_id AS rootId,
    //     refs.block_id AS blockId,
    //     refs.def_block_id AS linkId,
    //     '' AS markdown,
    //     'BlockRef' AS type 
    // FROM refs LEFT JOIN blockTreeTb ON blockTreeTb.id = refs.block_id
    // WHERE EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = refs.block_id)
    //     OR refs.root_id IN ( SELECT id FROM idsTb )

    // UNION ALL`;
    //     }

    //     if (paramObj.isQueryHyperlink) {
    //         selectUnionSql += `
    // SELECT
    //     spans.block_id AS blockId,
    //     '' AS linkId,
    //     spans.markdown AS markdown,
    //     'Hyperlink' AS type 
    // FROM spans 
    // WHERE
    //     (EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = spans.block_id) 
    //         OR root_id IN ( SELECT id FROM idsTb ) )
    //     AND markdown LIKE '%siyuan://blocks/%' 
    //     AND type LIKE '% a%'

    // UNION ALL
    // `;
    //     }


    let whereSql = ``
    if (paramObj.isQueryRefBlock || paramObj.isQueryHyperlink) {
        let refAndHyperlinkSqlArray = [];

        if (paramObj.isQueryRefBlock) {
            refAndHyperlinkSqlArray.push(`(blocks.markdown LIKE '%((%))%')`);
        }
        if (paramObj.isQueryHyperlink) {
            refAndHyperlinkSqlArray.push(`(blocks.markdown LIKE '%siyuan://blocks/%')`)
        }

        let refAndHyperlinkSql = refAndHyperlinkSqlArray.join(" OR ");

        whereSql = ` (blocks.type in ('h','p','t') AND ( ${refAndHyperlinkSql} )) `
    }


    if (paramObj.isQueryAttributeView) {
        if (isStrNotBlank(whereSql)) {
            whereSql += ` OR `
        }
        whereSql += ` (blocks.type = 'av') `;

    }

    selectUnionSql += `
SELECT 
    blocks.root_id AS rootId,
    blockTreeTb.temp_root_id AS tempRootId,
    blocks.id AS blockId,
    blocks.markdown AS markdown, 
    blocks.type
FROM blocks LEFT JOIN blockTreeTb ON blockTreeTb.id = blocks.id
WHERE (EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = blocks.id) 
        OR blocks.root_id IN ( SELECT id FROM idsTb ) )
	AND ( ${whereSql} )
UNION ALL
SELECT DISTINCT blockTreeTb.root_id AS rootId, blockTreeTb.temp_root_id AS tempRootId,  '', '', '' FROM blockTreeTb
	
`;
    // SELECT DISTINCT blockTreeTb.temp_root_id AS tempRootId, blockTreeTb.root_id AS rootId, '', '', '' FROM blockTreeTb 
    // 是为了获取所有传入的 RootId 和 文档ID ，他们底下没有对应的 av 或 引用id也查询出来，用来缓存他们没有。
    let sql = `${rescursiveTableSql}  ${selectUnionSql}`;


    return cleanSpaceText(sql);
}





// 根据块ID，查询指定块和对应的文档块
export function generateQueryBlocksWithDocsByIdsSql(
    queryCriteria: BlockQueryCriteria
) {

    let includeTypes = queryCriteria.includeBlockTypes;
    let includeRootIds = queryCriteria.includeRootIds;

    let idsValuesSql = generateValuesRow(includeRootIds);

    let includeTypesD: string[] = [...includeTypes, "d"];
    let typeInSql = generateAndInConditions("type", includeTypesD);

    let whereSql = `
id IN ( SELECT id FROM idsTb ) 
 ${typeInSql}
`;

    let basicSql = `	
WITH RECURSIVE idsTb(id) AS (
  VALUES ${idsValuesSql}
)  

SELECT * FROM blocks WHERE ${whereSql}
UNION ALL 
SELECT * FROM blocks 
WHERE id in ( SELECT root_id FROM blocks WHERE ${whereSql} )

LIMIT 999999999;
    `;
    return cleanSpaceText(basicSql);
}


export function generateQueryByKeywordAndRootIdSql(
    queryCriteria: BlockQueryCriteria
) {

    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let includeTypes = queryCriteria.includeBlockTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let includeRootIds = queryCriteria.includeRootIds;

    let idsValuesSql = generateValuesRow(includeRootIds);

    let concatConcatFieldSql = getConcatFieldSql(null, includeConcatFields);
    let includeTypesD: string[] = [...includeTypes, "d"];
    let typeInSql = generateAndInConditions("type", includeTypesD);

    let contentMatchSql = "";
    if (isArrayNotEmpty(includeKeywords)) {
        let contentLikeSql = generateAndLikeConditions(concatConcatFieldSql, includeKeywords);
        if (isStrNotBlank(contentLikeSql)) {
            contentMatchSql += " AND " + contentLikeSql;
        }
    }
    if (isArrayNotEmpty(excludeKeywords)) {
        let contentNotLikeSql = generateAndNotLikeConditions(concatConcatFieldSql, excludeKeywords);
        if (isStrNotBlank(contentNotLikeSql)) {
            contentMatchSql += " AND " + contentNotLikeSql;
        }
    }

    let whereSql = `
 ( EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = blocks.id) OR root_id IN ( SELECT id FROM idsTb ) )
 ${contentMatchSql}
 ${typeInSql}
`;

    let basicSql = `	
WITH RECURSIVE idsTb(id) AS (
  VALUES ${idsValuesSql}
),
blockTreeTb AS (
	SELECT id AS temp_root_id, *  FROM blocks 
	WHERE id != root_id  AND id IN ( SELECT id FROM idsTb )
UNION ALL
	SELECT blockTreeTb.temp_root_id, t.* 
	FROM blocks t INNER JOIN blockTreeTb ON t.parent_id = blockTreeTb.id 
)     

SELECT * FROM blocks WHERE ${whereSql}
UNION ALL 
SELECT * FROM blocks 
WHERE id in ( SELECT root_id FROM blocks WHERE ${whereSql} )

LIMIT 999999999;
    `;
    return cleanSpaceText(basicSql);
}



/**
 * 目前分页的速度还略慢与全部查询，直接全部查询，在JS中做排序和分页吧。
 * @param queryCriteria 
 * @returns 
 */
export function generateQueryPageByKeywordAndRootIdSql(
    queryCriteria: BlockQueryCriteria
) {

    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let includeTypes = queryCriteria.includeBlockTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let includeRootIds = queryCriteria.includeRootIds;

    let limitSql = generateLimitSql(queryCriteria.pages);
    let idsValuesSql = generateValuesRow(includeRootIds);
    let concatConcatFieldSql = getConcatFieldSql(null, includeConcatFields);
    let includeTypesD: string[] = [...includeTypes, "d"];
    let typeInSql = generateAndInConditions("type", includeTypesD);
    let contentParamSql = " AND " + generateAndLikeConditions(concatConcatFieldSql, includeKeywords);
    if (isArrayNotEmpty(excludeKeywords)) {
        let contentNotLikeSql = generateAndNotLikeConditions(concatConcatFieldSql, excludeKeywords);
        if (isStrNotBlank(contentNotLikeSql)) {
            contentParamSql += " AND " + contentNotLikeSql;
        }
    }

    let whereSql = `
( EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = blocks.id) OR root_id IN ( SELECT id FROM idsTb ) )
 ${contentParamSql}
 ${typeInSql}
`;

    let basicSql = `	
WITH RECURSIVE idsTb(id) AS (
  VALUES ${idsValuesSql}
),
blockTreeTb AS (
	SELECT id AS temp_root_id, *  FROM blocks 
	WHERE id != root_id  AND id IN ( SELECT id FROM idsTb )
UNION ALL
	SELECT blockTreeTb.temp_root_id, t.* 
	FROM blocks t INNER JOIN blockTreeTb ON t.parent_id = blockTreeTb.id 
),
rootIdTb AS (
	SELECT id FROM blocks 
WHERE id IN ( SELECT root_id  FROM blocks WHERE ${whereSql} )
	ORDER BY created DESC ${limitSql}
)   

SELECT * FROM blocks WHERE ( ${whereSql}  AND root_id IN ( SELECT id FROM rootIdTb ) ) OR id in (select id FROM rootIdTb )

LIMIT 999999999;
    `;

    return cleanSpaceText(basicSql);
}


export function generateCrossBlockQueryByKeywordAndRootIdSql(
    queryCriteria: BlockQueryCriteria
) {
    let includeKeywords = queryCriteria.includeKeywords;
    let excludeKeywords = queryCriteria.excludeKeywords;
    let includeTypes = queryCriteria.includeBlockTypes;
    let includeConcatFields = queryCriteria.includeConcatFields;
    let includeRootIds = queryCriteria.includeRootIds;

    let idsValuesSql = generateValuesRow(includeRootIds);

    let concatConcatFieldSql = getConcatFieldSql(null, includeConcatFields);

    let GroupConcatConcatFieldSql = `GROUP_CONCAT ${concatConcatFieldSql}`;
    let includeTypesD: string[] = [...includeTypes, "d"];
    let typeInSql = generateAndInConditions("type", includeTypesD);

    let contentMatchSql = "";
    if (isArrayNotEmpty(includeKeywords)) {
        let contentLikeSql = generateOrLikeConditions(concatConcatFieldSql, includeKeywords);
        if (isStrNotBlank(contentLikeSql)) {
            contentMatchSql += " AND ( " + contentLikeSql + " ) ";
        }
    }

    let docFullContentMatchSql = "";
    if (isArrayNotEmpty(includeKeywords)) {
        let contentLikeSql = generateAndLikeConditions(GroupConcatConcatFieldSql, includeKeywords);
        if (isStrNotBlank(contentLikeSql)) {
            docFullContentMatchSql += " AND " + contentLikeSql;
        }
    }
    if (isArrayNotEmpty(excludeKeywords)) {
        let contentNotLikeSql = generateAndNotLikeConditions(GroupConcatConcatFieldSql, excludeKeywords);
        if (isStrNotBlank(contentNotLikeSql)) {
            docFullContentMatchSql += ` AND  ${contentNotLikeSql} `;
        }
    }


    let whereSql = `
( EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = blocks.id) OR root_id IN ( SELECT id FROM idsTb ) )
 ${contentMatchSql}
 ${typeInSql}
`;

    let basicSql = `	
WITH RECURSIVE idsTb(id) AS (
  VALUES ${idsValuesSql}
),
blockTreeTb AS (
	SELECT id AS temp_root_id, *  FROM blocks 
	WHERE id != root_id  AND id IN ( SELECT id FROM idsTb )
UNION ALL
	SELECT blockTreeTb.temp_root_id, t.* 
	FROM blocks t INNER JOIN blockTreeTb ON t.parent_id = blockTreeTb.id 
),
rootIdTb AS (
  	SELECT root_id FROM blocks 
	WHERE
		( EXISTS ( SELECT 1 FROM blockTreeTb WHERE blockTreeTb.id = blocks.id) OR root_id IN ( SELECT id FROM idsTb ) )
         ${typeInSql}
	GROUP BY
		root_id 
	HAVING
		1 = 1 ${docFullContentMatchSql}
)	  

SELECT * FROM blocks 
WHERE ( ${whereSql}  AND root_id in (SELECT root_id FROM rootIdTb) )
    OR id IN ( SELECT root_id FROM rootIdTb )
LIMIT 999999999;
    `;
    return cleanSpaceText(basicSql);

}


export function generateGetBlockArraySql(
    blockIds: string[],
): string {
    let idInSql = generateAndInConditions("id", blockIds);

    let sql = `
    SELECT b.*
    FROM blocks b
    WHERE 1 = 1 
    ${idInSql}
    LIMIT 999999999;
    `
    return cleanSpaceText(sql);
}




export function generateGetChildBlockArraySql(
    rootId: string,
    focusBlockId: string,

): string {
    let sql = `
    WITH RECURSIVE blockTreeTb AS (
            SELECT *
            FROM blocks
            WHERE id = '${focusBlockId}' AND root_id = '${rootId}'
            UNION ALL
            SELECT t.*
            FROM blocks t
            INNER JOIN blockTreeTb ON t.parent_id = blockTreeTb.id
            WHERE t.root_id = '${rootId}'
            AND t.type NOT IN ( 'd', 'i', 'tb', 'audio', 'widget', 'iframe', 'query_embed' ) 
    )
    SELECT blockTreeTb.*
    FROM blockTreeTb
    LIMIT 999999999;
    `
    return cleanSpaceText(sql);
}




function generatMarkdownOrLikeDefBlockIdConditions(
    fieldName: string,
    params: string[],
): string {
    if (params.length === 0) {
        return " ";
    }

    const conditions = params.map(
        (param) => `${fieldName}  LIKE '%((${param} %))%'`,
    );
    const result = conditions.join(" OR ");

    return result;
}


function generateAndInConditions(
    fieldName: string,
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` AND ${fieldName} IN (`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}

function generateAndNotInConditions(
    fieldName: string,
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` AND ${fieldName} NOT IN (`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}

function generateOrInConditions(
    fieldName: string,
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` OR ${fieldName} IN (`
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}


function generateInConditions(
    params: string[],
): string {
    if (!params || params.length === 0) {
        return " ";
    }
    let result = ` ( `
    const conditions = params.map(
        (param) => ` '${param}' `,
    );
    result = result + conditions.join(" , ") + " ) ";

    return result;
}


function generateOrLikeConditions(
    fieldName: string,
    params: string[],
): string {
    if (params.length === 0) {
        return " ";
    }

    const conditions = params.map(
        (param) => `${fieldName} LIKE '%${param}%'`,
    );
    const result = conditions.join(" OR ");

    return result;
}


function generateAndLikeConditions(
    fieldName: string,
    params: string[],
): string {
    if (params.length === 0) {
        return " ";
    }

    const conditions = [];
    for (const param of params) {
        if (isStrNotBlank(param)) {
            conditions.push(`${fieldName}  LIKE '%${param}%'`)
        }
    }
    const result = conditions.join(" AND ");

    return result;
}


function generateAndNotLikeConditions(
    fieldName: string,
    params: string[],
): string {
    if (params.length === 0) {
        return " ";
    }
    const conditions = [];
    for (const param of params) {
        if (isStrNotBlank(param)) {
            conditions.push(`${fieldName} NOT LIKE '%${param}%'`);
        }
    }
    const result = conditions.join(" AND ");

    return result;
}



function generateValuesRow(rows: string[]) {
    if (!rows || rows.length === 0) {
        return " ";
    }
    const result = rows.map(
        (param) => ` ('${param}') `,
    );
    return result;
}




function generateValuesTable(rows: string[][]) {
    if (!rows || rows.length === 0) {
        return " ";
    }
    let result = rows.map(row => `(${row.map(item => `'${item}'`).join(', ')})`).join(' , ');

    return result;
}


function getConcatFieldSql(asFieldName: string, fields: string[]): string {
    if (!fields || fields.length <= 0) {
        return "";
    }
    // let sql = ` ( ${fields.join(" || ' '  || ")} ) `;
    let sql = ` ( ${fields.join(" || ")} ) `
    if (asFieldName) {
        sql += ` AS ${asFieldName} `;
    }

    return sql;
}


function generateRelevanceOrderSql(columnName: string, keywords: string[], orderAsc: boolean): string {
    let subSql = "";

    for (let i = 0; i < keywords.length; i++) {
        let key = keywords[i];
        subSql += ` (${columnName} LIKE '%${key}%') `;
        if (i < keywords.length - 1) {
            subSql += ' + ';
        }
    }

    let orderSql = "";
    if (subSql) {
        let sortDirection = orderAsc ? " ASC " : " DESC ";
        orderSql = `( ${subSql} ) ${sortDirection}`;
    }
    return orderSql;
}


function generateOrderSql(orders: string[]): string {
    let orderSql = '';
    if (orders) {
        orders = orders.filter((order) => order);
        let orderParam = orders.join(",");
        if (orderParam) {
            orderSql = ` ORDER BY ${orderParam} `;
        }
    }
    return orderSql;
}

function generateLimitSql(pages: number[]): string {
    let limitSql = '';
    if (pages) {
        const limit = pages[1];
        if (pages.length == 1) {
            limitSql = ` LIMIT ${limit} `;
        } else if (pages.length == 2) {
            const offset = (pages[0] - 1) * pages[1];
            limitSql = ` LIMIT ${limit} OFFSET ${offset} `;
        }
    }
    return limitSql;
}

function cleanSpaceText(inputText: string): string {
    // 去除换行
    let cleanedText = inputText.replace(/[\r\n]+/g, ' ');

    // 将多个空格转为一个空格
    cleanedText = cleanedText.replace(/\s+/g, ' ');

    // 去除首尾空格
    cleanedText = cleanedText.trim();

    return cleanedText;
}
