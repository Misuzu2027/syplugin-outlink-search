
import { SiyuanConstants } from "@/models/siyuan-constant";
import { isStrBlank, isStrNotBlank } from "./string-util";

export function getNotebookIcon(iconStr: string): string {
    if (isStrBlank(iconStr)) {
        iconStr = SiyuanConstants.SIYUAN_IMAGE_NOTE;
    }
    let icon: string = null;
    icon = convertIconInIal(iconStr);

    return icon;
}


export function getDocIconHtmlByIal(ialStr: string, iconStr, subCount: number): string {


    let iconHtml: string = null;
    if (ialStr) {
        let ial = convertIalStringToObject(ialStr);
        iconHtml = convertIconInIal(ial.icon);
    }
    if (isStrBlank(iconHtml) && isStrNotBlank(iconStr)) {
        iconHtml = convertIconInIal(iconStr);
    }
    if (isStrBlank(iconHtml)) {
        let defFileIconStr = subCount && subCount > 0
            ? SiyuanConstants.SIYUAN_IMAGE_FOLDER : SiyuanConstants.SIYUAN_IMAGE_FILE;
        iconHtml = convertIconInIal(defFileIconStr);
    }
    if (!iconHtml.startsWith("<")) {
        iconHtml = `<span class="b3-list-item__graphic">${iconHtml}</span>`;
    }
    return iconHtml;
}

export function convertIconInIal(icon: string): string {
    if (isStrBlank(icon)) {
        return null;
    }

    if (icon.includes(".")) {
        // 如果包含 "."，则认为是图片，生成<img>标签
        return `<img class="b3-list-item__graphic" src="/emojis/${icon}">`;
    } else if (icon.startsWith("api/icon/")) {
        return `<img class="b3-list-item__graphic" src="${icon}">`;
    } else {
        // 如果是Emoji，转换为表情符号
        let emoji = "";
        try {
            icon.split("-").forEach(item => {
                if (item.length < 5) {
                    emoji += String.fromCodePoint(parseInt("0" + item, 16));
                } else {
                    emoji += String.fromCodePoint(parseInt(item, 16));
                }
            });

        } catch (e) {
            // 自定义表情搜索报错 https://github.com/siyuan-note/siyuan/issues/5883
            // 这里忽略错误不做处理
        }
        return emoji;
    }
}

export function convertIalStringToObject(ial: string): { [key: string]: string } {
    const keyValuePairs = ial.match(/\w+="[^"]*"/g);

    if (!keyValuePairs) {
        return {};
    }

    const resultObject: { [key: string]: string } = {};

    keyValuePairs.forEach((pair) => {
        const [key, value] = pair.split('=');
        resultObject[key] = value.replace(/"/g, ''); // 去除值中的双引号
    });

    return resultObject;
}



export function getBlockTypeIconHref(type: string, subType: string): string {
    let iconHref = "";
    if (type) {
        if (type === "d") {
            iconHref = "#iconFile";
        } else if (type === "h") {
            if (subType === "h1") {
                iconHref = "#iconH1";
            } else if (subType === "h2") {
                iconHref = "#iconH2";
            } else if (subType === "h3") {
                iconHref = "#iconH3";
            } else if (subType === "h4") {
                iconHref = "#iconH4";
            } else if (subType === "h5") {
                iconHref = "#iconH5";
            } else if (subType === "h6") {
                iconHref = "#iconH6";
            }
        } else if (type === "c") {
            iconHref = "#iconCode";
        } else if (type === "html") {
            iconHref = "#iconHTML5";
        } else if (type === "p") {
            iconHref = "#iconParagraph";
        } else if (type === "m") {
            iconHref = "#iconMath";
        } else if (type === "t") {
            iconHref = "#iconTable";
        } else if (type === "b") {
            iconHref = "#iconQuote";
        } else if (type === "l") {
            if (subType === "o") {
                iconHref = "#iconOrderedList";
            } else if (subType === "u") {
                iconHref = "#iconList";
            } else if (subType === "t") {
                iconHref = "#iconCheck";
            }
        } else if (type === "i") {
            iconHref = "#iconListItem";
        } else if (type === "av") {
            iconHref = "#iconDatabase";
        } else if (type === "s") {
            iconHref = "#iconSuper";
        } else if (type === "audio") {
            iconHref = "#iconRecord";
        } else if (type === "video") {
            iconHref = "#iconVideo";
        } else if (type === "query_embed") {
            iconHref = "#iconSQL";
        } else if (type === "tb") {
            iconHref = "#iconLine";
        } else if (type === "widget") {
            iconHref = "#iconBoth";
        } else if (type === "iframe") {
            iconHref = "#iconLanguage";
        }
    }
    return iconHref;
}