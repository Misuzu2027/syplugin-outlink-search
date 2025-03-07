import { Constants } from "siyuan";
import { isStrBlank, removePrefixAndSuffix } from "./string-util";
import { isArrayEmpty } from "./array-util";
import { EnvConfig } from "@/config/EnvConfig";

// 用于生成随机字符串
function randStr(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function NewNodeID(): string {

  const now = new Date();
  const formattedDate = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14); // 格式化为 "YYYYMMDDHHMMSS"
  return `${formattedDate}-${randStr(7)}`;
}

export function getQueryStrByBlock(block: Block) {
  if (!block) {
    return "";
  }
  return block.markdown + " " + block.name + " " + block.alias + " " + block.memo + " " + block.tag;

}

export function getActiveTab(): HTMLDivElement {
  let tab = document.querySelector("div.layout__wnd--active ul.layout-tab-bar>li.item--focus");
  let dataId: string = tab?.getAttribute("data-id");
  if (!dataId) {
    return null;
  }
  const activeTab: HTMLDivElement = document.querySelector(
    `.layout-tab-container.fn__flex-1>div.protyle[data-id="${dataId}"]`
  ) as HTMLDivElement;
  return activeTab;
}

export function getActiveTabId(): string {
  let currentDocument: HTMLDivElement = getActiveTab();
  if (!currentDocument) {
    return null;
  }

  const docTitleElement = currentDocument.querySelector(".protyle-title");
  let docId = docTitleElement.getAttribute("data-node-id");
  return docId;
}

export function getNodeId(node: Node | null): string | null {
  if (!node) {
    return null;
  }
  if (node instanceof Element) {
    const nodeId = (node as HTMLElement).getAttribute("data-node-id");
    if (nodeId) {
      return nodeId;
    }
  }
  // 递归查找父节点
  return getNodeId(node.parentNode);
}



export function getOpenTabActionByZoomIn(zoomIn: boolean): TProtyleAction[] {
  let actions: TProtyleAction[] = zoomIn
    ? [
      Constants.CB_GET_HL,
      Constants.CB_GET_FOCUS,
      Constants.CB_GET_ALL,
    ]
    : [
      Constants.CB_GET_HL,
      // Constants.CB_GET_FOCUS,
      Constants.CB_GET_CONTEXT,
      Constants.CB_GET_ROOTSCROLL,
    ];
  return actions;
}


export function extractHyperlinkBlockId(str: string): string {
  if (isStrBlank(str)) {
    return null;
  }
  const regex = /siyuan:\/\/blocks\/([a-zA-Z0-9-]+)/;
  const match = str.match(regex);
  return match ? match[1] : null; // 如果匹配到，返回捕获的内容，否则返回 null
  // 示例
  // const input = "[数据库](siyuan://blocks/20250222134455-64ue8gh)";
  // const result = extractId(input);
  // console.log(result);  // 输出：20250222134455-64ue8gh
}

export function extractHyperlinkBlockIds(str: string): string[] {
  if (isStrBlank(str)) {
    return [];
  }

  const regex = /siyuan:\/\/blocks\/(\d{14}-\w{7})/g;
  const matches = Array.from(str.matchAll(regex));

  return matches.length > 0 ? matches.map(match => match[1]) : [];
}

export function getRefBlockId(markdown: string): string[] {
  const matches = [];
  if (!markdown) {
    return matches;
  }

  let regex = /\(\((\d{14}-\w{7})\s'[^']+'\)\)/g;
  regex = /\(\((\d{14}-\w{7})\s['"][^'"]+['"]\)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}


// 示例用法：
// const input = "[链接1](siyuan://blocks/20250222134455-64ue8gh) 链接2(siyuan://blocks/20230301123456-abcd789)";
// const result = extractHyperlinkBlockId(input);
// console.log(result);  // 输出：["20250222134455-64ue8gh", "20230301123456-abcd789"]


export function highlightBlockContent(block: Block, keywords: string[]) {
  if (!block || isArrayEmpty(keywords)) {
    return;
  }
  let contentHtml = getHighlightedContent(block.content, keywords);
  let nameHml = getHighlightedContent(block.name, keywords);
  let aliasHtml = getHighlightedContent(block.alias, keywords);
  let memoHtml = getHighlightedContent(block.memo, keywords);
  let tagHtml = getHighlightedContent(block.tag, keywords);
  block.content = contentHtml;
  block.name = nameHml;
  block.alias = aliasHtml;
  block.memo = memoHtml;
  block.tag = tagHtml;
}

export function getHighlightedContent(
  content: string,
  keywords: string[],
): string {
  if (!content) {
    return content;
  }
  // let highlightedContent: string = escapeHtml(content);
  let highlightedContent: string = content;

  if (keywords) {
    highlightedContent = highlightMatches(highlightedContent, keywords);
  }
  return highlightedContent;
}


function highlightMatches(content: string, keywords: string[]): string {
  if (!keywords.length || !content) {
    return content; // 返回原始字符串，因为没有需要匹配的内容
  }

  const regexPattern = new RegExp(`(${keywords.join("|")})`, "gi");
  const highlightedString = content.replace(
    regexPattern,
    "<mark>$1</mark>",
  );
  return highlightedString;
}


let bgFadeTimeoutId: NodeJS.Timeout;

export function bgFade(element: Element) {
  if (bgFadeTimeoutId) {
    clearTimeout(bgFadeTimeoutId);
    bgFadeTimeoutId = null;
  }
  element.parentElement.querySelectorAll(".protyle-wysiwyg--hl").forEach((hlItem) => {
    hlItem.classList.remove("protyle-wysiwyg--hl");
  });
  element.classList.add("protyle-wysiwyg--hl");
  bgFadeTimeoutId = setTimeout(function () {
    element.classList.remove("protyle-wysiwyg--hl");
  }, 1536);
};

export function highlightContent(content: string, keywords: string[]): string {
  if (!content) {
    return content;
  }
  let contentHtml = getHighlightedContent(content, keywords);
  return contentHtml;
}


export function parseDateTimeInBlock(dateTimeString: string): Date | null {
  if (dateTimeString.length !== 14) {
    console.error("Invalid date time string format. It should be 'yyyyMMddhhmmss'.");
    return null;
  }

  const year = parseInt(dateTimeString.slice(0, 4), 10);
  const month = parseInt(dateTimeString.slice(4, 6), 10) - 1; // 月份从 0 开始
  const day = parseInt(dateTimeString.slice(6, 8), 10);
  const hour = parseInt(dateTimeString.slice(8, 10), 10);
  const minute = parseInt(dateTimeString.slice(10, 12), 10);
  const second = parseInt(dateTimeString.slice(12, 14), 10);

  return new Date(year, month, day, hour, minute, second);
}


export function convertDateTimeInBlock(dateTimeString: string): string {
  if (dateTimeString.length !== 14) {
    console.error("Invalid date time string format. It should be 'yyyyMMddhhmmss'.");
    return null;
  }
  const year = dateTimeString.slice(0, 4);
  const month = dateTimeString.slice(4, 6);
  const day = dateTimeString.slice(6, 8);
  const hour = dateTimeString.slice(8, 10);
  const minute = dateTimeString.slice(10, 12);
  const second = dateTimeString.slice(12, 14);

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}



export function getFileArialLabel(fileBlock: Block, boxName: string): string {
  let ariaLabelRow: string[] = [];
  ariaLabelRow.push(fileBlock.content);
  if (fileBlock.name) {
    ariaLabelRow.push(
      `\n${window.siyuan.languages.name} ${fileBlock.name}`,
    );
  }
  if (fileBlock.alias) {
    ariaLabelRow.push(
      `\n${window.siyuan.languages.alias} ${fileBlock.alias}`,
    );
  }
  if (fileBlock.tag) {
    ariaLabelRow.push(
      `\n${window.siyuan.languages.tag} ${fileBlock.tag}`,
    );
  }
  if (fileBlock.memo) {
    ariaLabelRow.push(
      `\n${window.siyuan.languages.memo} ${fileBlock.memo}`,
    );
  }

  ariaLabelRow.push(`<br>${EnvConfig.ins.i18n.notebook} ${boxName}`);
  if (fileBlock.hpath) {
    ariaLabelRow.push(`\n${EnvConfig.ins.i18n.path} ${fileBlock.hpath}`);
  }

  let updated = fileBlock.updated;
  let created = fileBlock.created;
  if (updated.length === 14) {
    updated = convertDateTimeInBlock(fileBlock.updated);
    updated += ", " + formatRelativeTimeInBlock(fileBlock.updated);
  }
  if (created.length === 14) {
    created = convertDateTimeInBlock(fileBlock.created);
    created += ", " + formatRelativeTimeInBlock(fileBlock.created);
  }

  ariaLabelRow.push(
    `\n${window.siyuan.languages.modifiedAt} ${updated}`,
  );
  ariaLabelRow.push(
    `\n${window.siyuan.languages.createdAt} ${created}`,
  );

  let ariaLabel = ariaLabelRow.join("");
  ariaLabel = removePrefixAndSuffix(ariaLabel, "\n", "");

  return ariaLabel;
}


export function formatRelativeTimeInBlock(dateTimeString: string): string {
  let timestamp = parseDateTimeInBlock(dateTimeString).getTime();
  return formatRelativeTime(timestamp);
}



export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) {
    return `${Math.floor(diff / 1000)}秒前`;
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
}



export function isElementHidden(element: Element) {
  if (!element || element.tagName === "BODY") {
    return false;
  }

  if (element.classList.contains("fn__none")) {
    return true;
  }

  return isElementHidden(element.parentElement);
}
