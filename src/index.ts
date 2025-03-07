import {
    Plugin,
} from "siyuan";
import "@/index.scss";


import { TabService } from '@/service/plugin/TabService';
import { EnvConfig } from '@/config/EnvConfig';
import { SettingService } from '@/service/setting/SettingService';
import { CacheManager } from '@/config/CacheManager';
import { DockService } from "@/service/plugin/DockServices";
import { TopBarService } from "@/service/plugin/TopBarService";
import { CUSTOM_ICON_MAP } from '@/models/icon-constant';
import { openSettingsDialog } from "@/components/setting/setting-util";


export default class PluginSample extends Plugin {


    async onload() {
        EnvConfig.ins.init(this);
        await SettingService.ins.init()
        CacheManager.ins.initSiyuanEventBus();
        DockService.ins.init();
        TabService.ins.init();
        TopBarService.ins.init();


        // 图标的制作参见帮助文档
        for (const key in CUSTOM_ICON_MAP) {
            if (Object.prototype.hasOwnProperty.call(CUSTOM_ICON_MAP, key)) {
                const item = CUSTOM_ICON_MAP[key];
                this.addIcons(item.source);
            }
        }

        this.eventBus.on('switch-protyle', (e: any) => {
            EnvConfig.ins.lastViewedDocId = e.detail.protyle.block.rootID;
        })
        this.eventBus.on('loaded-protyle-static', (e: any) => {
            // console.log("index loaded-protyle-static ")
            if (EnvConfig.ins.isMobile && !EnvConfig.ins.lastViewedDocId) {
                EnvConfig.ins.lastViewedDocId = e.detail.protyle.block.rootID;
            }
        })
    }






    onLayoutReady() {

    }

    async onunload() {
        CacheManager.ins.destorySiyuanEventBus();
    }

    uninstall() {
        // console.log("uninstall");
    }


    openSetting(): void {
        openSettingsDialog();
    }


}
