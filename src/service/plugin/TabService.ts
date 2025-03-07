import { EnvConfig } from "@/config/EnvConfig";
import OutLinkSearchPageSvelte from "@/components/outlink/outlink-search-page.svelte";
import Instance from "@/utils/Instance";
import { openTab } from "siyuan";
import { CUSTOM_ICON_MAP } from "@/models/icon-constant";
import { isStrBlank } from "@/utils/string-util";
import { clearProtyleGutters } from "@/utils/html-util";
import { getActiveTab } from "@/utils/siyuan-util";


const OUTLINK_TAB_PREFIX = "outlink_tab_"

export class TabService {


    public static get ins(): TabService {
        return Instance.get(TabService);
    }

    public init() {
        EnvConfig.ins.plugin.addCommand({
            langKey: "showDocumentOutlinkSearchTab",
            langText: "显示当前文出链搜索页签",
            hotkey: "⌥⇧⌘O",
            editorCallback: (protyle: any) => {

                let currentDocument: HTMLDivElement = getActiveTab();
                if (!currentDocument) {
                    return;
                }


                const docTitleElement = currentDocument.querySelector(".protyle-title");
                let docTitle = currentDocument.querySelector("div.protyle-title__input").textContent;
                let docId = docTitleElement.getAttribute("data-node-id");
                TabService.ins.openOutlinkTab(docTitle, docId, null);
            },
        });

    }

    public pluginAddTab(docId: string, focusBlockId: string) {
        let tabId = OUTLINK_TAB_PREFIX + docId;
        let outLinkSearchPageSvelte: OutLinkSearchPageSvelte;

        EnvConfig.ins.plugin.addTab({
            type: tabId,
            init() {
                outLinkSearchPageSvelte = new OutLinkSearchPageSvelte({
                    target: this.element,
                    props: {

                    }
                });

                outLinkSearchPageSvelte.switchDoc(docId, focusBlockId);
                this.element.addEventListener(
                    "scroll",
                    () => {
                        clearProtyleGutters(this.element);
                    },
                );
            },
            beforeDestroy() {
                outLinkSearchPageSvelte?.$destroy();
            },
            destroy() {
            },
            resize() {

            },
            update() {
            }
        });

    }


    public openOutlinkTab(docTitle: string, docId: string, focusBlockId: string) {
        if (isStrBlank(docTitle) || isStrBlank(docId)) {
            console.log("出链搜索插件 打开出链页签错误，参数缺失")
            return;
        }

        let tabId = OUTLINK_TAB_PREFIX + docId;

        this.pluginAddTab(docId, focusBlockId);

        openTab({
            app: EnvConfig.ins.app,
            custom: {
                id: EnvConfig.ins.plugin.name + tabId,
                icon: CUSTOM_ICON_MAP.OutlinkSearch.id,
                title: docTitle,
                // data: { rootId: docId, focusBlockId: focusBlockId }
            },
            position: "right",
            afterOpen() {
            }
        });
    }

}
