import { TFile, TAbstractFile, Plugin, moment, Notice, Platform } from 'obsidian';
import { createDailyNote, getDailyNoteSettings } from 'obsidian-daily-notes-interface';
import { Subject } from 'rxjs';
import { debounceTime, filter, groupBy, map, mergeMap, tap } from 'rxjs/operators';
import { CustomRuleSettings, DEFAULT_SETTINGS, RecordDurationSettings, RecordDurationSettingTab } from './settings';
import { createNoteByTemplate, getNotePath } from './utils';
import { updateKeyInContent } from './updateKey';

export default class RecordDurationPlugin extends Plugin {
	settings: RecordDurationSettings;

	fileOpen$ = new Subject<string>();
	fileClose$ = new Subject<string>();
	lastFile: TFile | null;
	lastRule: CustomRuleSettings;
	currentRule: CustomRuleSettings;
	startTime: moment.Moment;
	endTime: moment.Moment;
	statusBarItemEl: HTMLElement;
	intervalID: number;

	async onload() {
		console.log("loading reading-time...")
		await this.loadSettings();
		this.setupOnFileOpenHandler();
		this.listenOnFileOpen();
		this.listenOnFileClose();
		this.addSettingTab(new RecordDurationSettingTab(this.app, this));
		this.statusBarItemEl = this.addStatusBarItem();
	}

	onunload() {
	}

	updateStatusBar() {
		this.statusBarItemEl.setText("阅读了 " + moment().diff(this.startTime, 'minutes') + " 分钟");
	}

	setupOnFileOpenHandler() {
		this.app.workspace.on('file-open', async (file) => {
			// console.warn(app.workspace.getLeaf().view.getState())
			// workspace.activeLeaf.view.currentTitle
			// app.workspace.containerEl.childNodes[2].childNodes[1].childNodes[1].childNodes[0].childNodes[1].ariaLabel
			if (this.lastFile != null) {
				this.statusBarItemEl.setText("");
				this.lastRule = this.settings.rules.filter((fp) => {
					return this.lastFile?.path.startsWith(fp.source) || this.lastFile?.path.endsWith(fp.source)
				})[0];
				this.fileClose$.next(this.lastFile.path);
			}
			if (file != null) {
				this.currentRule = this.settings.rules.filter((fp) => {
					return file.path.startsWith(fp.source) || file.path.endsWith(fp.source)
				})[0];
				this.fileOpen$.next(file.path);
			}
			this.lastFile = this.app.workspace.getActiveFile();
		});
	}

	listenOnFileOpen() {
		this.fileOpen$
			.asObservable()
			.pipe(
				filter((path) => !!path),
				filter(() => this.currentRule != null),
				groupBy((value) => value),
				mergeMap((group) => group.pipe(debounceTime(10 * 1000))),
				map((path) =>
					this.app.vault.getFiles().find((inFile) => inFile.path === path),
				),
				filter((file) => !!file),
				tap((file) => {
					this.log(`File Open`, file);
				}),
			)
			.subscribe(async (file) => {
				try {
					await this.timer_start();
				} catch (e) {
					console.error(e);
				}
			});
	}

	listenOnFileClose() {
		this.fileClose$
			.asObservable()
			.pipe(
				filter((path) => !!path),
				filter(() => this.lastRule != null),
				groupBy((value) => value),
				mergeMap((group) => group.pipe(debounceTime(10 * 1000))),
				map((path) =>
					this.app.vault.getFiles().find((inFile) => inFile.path === path),
				),
				filter((file) => !!file),
				tap((file) => {
					this.log(`File Close`, file);
				}),
			)
			.subscribe(async (file) => {
				try {
					await this.timer_stop(file!);
				} catch (e) {
					console.error(e);
				}
			});
	}

	async timer_start(): Promise<void> {
		this.startTime = moment();
		// this.statusBarItemEl.setText("Reading: 0 Mins");
		this.intervalID = window.setInterval(() => this.updateStatusBar(), 1 * 60 * 1000)
		this.registerInterval(this.intervalID);
		console.log("Timer start...")
	}

	async timer_stop(file: TFile): Promise<void> {
		this.endTime = moment();
		window.clearInterval(this.intervalID);
		console.log("Timer stop...")

		let dif = this.endTime.diff(this.startTime, 'minutes');
		if (dif >= this.settings.minDuration) {
			if (this.lastRule.recordinsourcefile && Platform.isDesktopApp) {
				app.fileManager.processFrontMatter(file, (frontmatter) => {
					const orgi_value = frontmatter[this.lastRule.key3];
					if (orgi_value != null) {
						frontmatter[this.lastRule.key3] = orgi_value + dif;
					} else {
						frontmatter[this.lastRule.key3] = dif;
					}
				});
			}
			if (this.lastRule.recordinsourcefile && Platform.isMobileApp) {
				const ye = (<any>app).plugins.plugins.yamledit
				if (ye == null) {
					new Notice("缺少yamledit插件，无法在Mobile上更新源文件FrontMatter！")
				} else {
					const { getYamlEditApi } = ye.api
					const yamlApi = await getYamlEditApi(file)
					const orgi_value = yamlApi.get(this.lastRule.key3)
					if (orgi_value != null) {
						yamlApi.set(this.lastRule.key3, orgi_value + dif);
					} else {
						yamlApi.set(this.lastRule.key3, dif)
					}
					yamlApi.update()
				}
			}
			if (this.lastRule.recordindailyfile) {
				const { format, folder } = getDailyNoteSettings();
				const filename = moment().format(format);
				const dailyName = await getNotePath(folder!, filename);
				const exists = await (<any>app).vault.exists(dailyName)
				if (!exists) {
					await createDailyNote(moment());
				}
				const dailyFile = app.vault.getAbstractFileByPath(dailyName) as TFile;
				const dailyContent = await app.vault.read(dailyFile);
				let newDaliy = `${dailyContent}`;
				let newDaliy1 = updateKeyInContent(
					newDaliy,
					this.lastRule.key1,
					dif.toString(),
				);
				if (newDaliy == newDaliy1) new Notice("目标文件中无关键字！"); else
					await this.app.vault.modify(dailyFile, newDaliy1);
			}
			if (this.lastRule.recordintargetfile) {
				const format = this.lastRule.target;
				const filename = moment().format(format);
				const dailyName = await getNotePath(this.lastRule.targetfold, filename);
				const exists = await (<any>app).vault.exists(dailyName)
				if (!exists) {
					await createNoteByTemplate(moment(), this.lastRule.target, this.lastRule.targettemplate, this.lastRule.targetfold);
				}
				const targetFile = app.vault.getAbstractFileByPath(dailyName) as TFile;
				const fileContent = await app.vault.read(targetFile);
				let newFile = `${fileContent}`;
				let newFile1 = updateKeyInContent(
					newFile,
					this.lastRule.key2,
					dif.toString(),
				);
				if (newFile == newFile1) new Notice("目标文件中无关键字！"); else
					await this.app.vault.modify(targetFile, newFile1);
			}
		}
		this.log('阅读了 ' + dif.toString() + " 分钟。", file);
	}

	log(payload: string, file?: TAbstractFile) {
		console.log(
			`[READING TIME] ${file ? `[${file.path}] ` : ''}${payload}`,
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


