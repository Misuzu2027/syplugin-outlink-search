import { EnvConfig } from "@/config/EnvConfig";
import { CUSTOM_ICON_MAP } from "@/models/icon-constant";
import Instance from "@/utils/Instance";
import OutlinkSearchDockSvelte from "@/components/dock/outlink-search-dock.svelte";
import { SettingService } from "@/service/setting/SettingService";
import { clearProtyleGutters } from "@/utils/html-util";

const OUTLINK_SEARCH_DOCK_TYPE = "outlink-search-dock";
export class DockService {

    public static get ins(): DockService {
        return Instance.get(DockService);
    }

    init() {
        addFowardlinkPanelDock();

    }


}


function addFowardlinkPanelDock() {
    if (!EnvConfig.ins || !EnvConfig.ins.plugin) {
        console.log("添加出链 dock 失败。")
        return;
    }
    let dockDisplay = SettingService.ins.SettingConfig.dockPosition;
    if (!dockDisplay || dockDisplay == "Hidden") {
        return;
    }

    let plugin = EnvConfig.ins.plugin;
    let docSearchSvelet: OutlinkSearchDockSvelte;
    let dockRet = plugin.addDock({
        config: {
            position: dockDisplay,
            size: { width: 300, height: 0 },
            icon: CUSTOM_ICON_MAP.OutlinkSearch.id,
            title: "出链面板 Dock",
            hotkey: "⌥⇧O",
            show: false,
        },
        data: {},
        type: OUTLINK_SEARCH_DOCK_TYPE,
        resize() {
            if (docSearchSvelet) {
                docSearchSvelet.restView();
            }
        },
        update() {
        },
        init() {
            this.element.innerHTML = "";
            docSearchSvelet = new OutlinkSearchDockSvelte({
                target: this.element,
                props: {
                }
            });
            this.element.addEventListener(
                "scroll",
                () => {
                    clearProtyleGutters(this.element);
                },
            );

            if (EnvConfig.ins.isMobile) {
                docSearchSvelet.restView();
            }
        },
        destroy() {
            docSearchSvelet.$destroy();
        }
    });
    // EnvConfig.ins.docSearchDock = dockRet;
}
