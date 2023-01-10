import { App, PluginSettingTab, Setting, ButtonComponent } from "obsidian";
import RecordDurationPlugin from "./main";
import { FileorFoldSuggest, FileSuggest, FoldSuggest, tempFileSuggest } from "./suggest";

export interface RecordDurationSettings {
    rules: CustomRuleSettings[];
    minDuration: number;
}

export const DEFAULT_SETTINGS: RecordDurationSettings = {
    rules: [],
    minDuration: 5
}

export interface CustomRuleSettings {
    displayName: string;
    source: string;
    recordindailyfile: boolean;
    key1: string;
    recordintargetfile: boolean;
    target: string;
    targetfold: string;
    targettemplate: string;
    key2: string;
    recordinsourcefile: boolean;
    key3: string;
}


export class RecordDurationSettingTab extends PluginSettingTab {
    plugin: RecordDurationPlugin;

    constructor(app: App, plugin: RecordDurationPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Settings for Record File Time.' });

        new Setting(containerEl)
            .setName('最小记录时长:')
            .setDesc('不记录少于此时长的阅读。默认:5分钟')
            .addText(text => text
                .setPlaceholder('Enter minTime')
                .setValue(String(this.plugin.settings.minDuration))
                .onChange(async (value) => {
                    console.log('minTime: ' + value);
                    this.plugin.settings.minDuration = value.length ? Number(value) : DEFAULT_SETTINGS.minDuration;
                    await this.plugin.saveSettings();
                }));
        new ButtonComponent(containerEl)
            .setButtonText("增加新规则")
            .setClass("custom-rules-add")
            .onClick(async () => {
                this.plugin.settings.rules.push({
                    displayName: "新规则",
                    source: "",
                    recordindailyfile: false,
                    key1: "",
                    recordintargetfile: false,
                    target: "",
                    targetfold: "",
                    targettemplate: "",
                    key2: "",
                    recordinsourcefile: true,
                    key3: "reading-time",
                });
                await this.plugin.saveSettings();
                this.display();
            });
        containerEl.createEl("hr");

        for (let rule of this.plugin.settings.rules) {
            let heading = this.containerEl.createEl("h3", { text: rule.displayName || "未命名" });
            let toggle = new ButtonComponent(this.containerEl)
                .setButtonText("显示")
                .setClass("custom-rules-show")
                .onClick(async () => {
                    content.hidden = !content.hidden;
                    content2.hidden = content.hidden;
                    content4.hidden = content.hidden;
                    content6.hidden = content.hidden;
                    content1.hidden = content.hidden || !rule.recordindailyfile;
                    content3.hidden = content.hidden || !rule.recordintargetfile;
                    content5.hidden = content.hidden || !rule.recordinsourcefile;
                    toggle.setButtonText(content.hidden ? "显示" : "隐藏");
                });
            let content = this.containerEl.createDiv();
            content.hidden = true;
            let content1 = this.containerEl.createDiv();
            content1.hidden = true;
            let content2 = this.containerEl.createDiv();
            content2.hidden = true;
            let content3 = this.containerEl.createDiv();
            content3.hidden = true;
            let content4 = this.containerEl.createDiv();
            content4.hidden = true;
            let content5 = this.containerEl.createDiv();
            content5.hidden = true;
            let content6 = this.containerEl.createDiv();
            content6.hidden = true;

            new Setting(content)
                .setName("名称")
                .setDesc("此规则名称。")
                .addText(t => {
                    t.setValue(rule.displayName);
                    t.onChange(async v => {
                        rule.displayName = v;
                        heading.setText(rule.displayName || "未命名");
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content)
                .setName("源文件（夹）")
                .setDesc("需要记录时长的文件或文件夹。")
                .addText(t => {
                    new FileorFoldSuggest(this.app,t.inputEl)
                    t.setValue(rule.source);
                    t.onChange(async v => {
                        rule.source = v;
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content)
                .setName("在日记中记录")
                .setDesc("在日记文件中记录时长。")
                .addToggle(t => {
                    t.setValue(rule.recordindailyfile);
                    t.onChange(async v => {
                        content1.hidden = rule.recordindailyfile
                        rule.recordindailyfile = v;
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content1)
                .setName("    关键字")
                .setDesc("    存储记录的关键字。")
                .addText(t => {
                    t.setValue(rule.key1);
                    t.onChange(async v => {
                        rule.key1 = v;
                        await this.plugin.saveSettings();
                    });
                });
            content1.createEl("hr");
            new Setting(content2)
                .setName("在目标文件中记录")
                .setDesc("在指定的目标文件中记录时长。")
                .addToggle(t => {
                    t.setValue(rule.recordintargetfile);
                    t.onChange(async v => {
                        content3.hidden = rule.recordintargetfile
                        rule.recordintargetfile = v;
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content3)
                .setName("    文件名格式")
                .setDesc("    参考日记插件。")
                .addText(t => {
                    t.setValue(rule.target);
                    t.onChange(async v => {
                        rule.target = v;
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content3)
                .setName("    新文件的存放位置")
                .setDesc("    指定新文的存放路径。")
                // .addSearch((cb) => {
                //     new FoldSuggest(this.app,cb.inputEl);
                //     cb.setPlaceholder("Example: folder1/folder2")
                //         .setValue(rule.targetfold)
                //         .onChange((new_folder) => {
                //             rule.targetfold = new_folder;
                //             this.plugin.saveSettings();
                //         });
                //     // @ts-ignore
                //     cb.containerEl.addClass("target_fold");
                // });
            .addText(t => {
                new FoldSuggest(this.app,t.inputEl);
                t.setValue(rule.targetfold);
                t.onChange(async v => {
                    rule.targetfold = v;
                    await this.plugin.saveSettings();
                });
            });
            new Setting(content3)
                .setName("    文件模板")
                .setDesc("    指定文件模板的路径")
                .addText(t => {
                    new tempFileSuggest(this.app,t.inputEl)
                    t.setValue(rule.targettemplate);
                    t.onChange(async v => {
                        rule.targettemplate = v;
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content3)
                .setName("    关键字")
                .setDesc("    存储记录的关键字。")
                .addText(t => {
                    t.setValue(rule.key2);
                    t.onChange(async v => {
                        rule.key2 = v;
                        await this.plugin.saveSettings();
                    });
                });
            content3.createEl("hr");
            new Setting(content4)
                .setName("在源文件中记录时长")
                .setDesc("在源文件Frontmatter中记录时长。")
                .addToggle(t => {
                    t.setValue(rule.recordinsourcefile);
                    t.onChange(async v => {
                        content5.hidden = rule.recordinsourcefile
                        rule.recordinsourcefile = v;
                        await this.plugin.saveSettings();
                    });
                });
            new Setting(content5)
                .setName("    关键字")
                .setDesc("    存储记录的关键字。")
                .addText(t => {
                    t.setValue(rule.key3);
                    t.onChange(async v => {
                        rule.key3 = v;
                        await this.plugin.saveSettings();
                    });
                });
            // content5.createEl("hr");
            new ButtonComponent(content6)
                .setButtonText("删除")
                .onClick(async () => {
                    this.plugin.settings.rules.remove(rule);
                    await this.plugin.saveSettings();
                    this.display();
                });
            content6.createEl("hr");
        }
    }
}
