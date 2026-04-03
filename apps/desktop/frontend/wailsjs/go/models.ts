export namespace main {
	
	export class SettingsDTO {
	    networkThresholdKbps: number;
	    diskThresholdMBps: number;
	    trackDiskUsage: boolean;
	    chartRangeSeconds: number;
	    idleDurationSeconds: number;
	    countdownDurationSeconds: number;
	    action: string;
	    downloaderType: string;
	    useBitsPerSecond: boolean;
	    sampleIntervalSeconds: number;
	    pauseWhenTrackedAppsRunning: boolean;
	    trackedApps: string[];
	
	    static createFrom(source: any = {}) {
	        return new SettingsDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.networkThresholdKbps = source["networkThresholdKbps"];
	        this.diskThresholdMBps = source["diskThresholdMBps"];
	        this.trackDiskUsage = source["trackDiskUsage"];
	        this.chartRangeSeconds = source["chartRangeSeconds"];
	        this.idleDurationSeconds = source["idleDurationSeconds"];
	        this.countdownDurationSeconds = source["countdownDurationSeconds"];
	        this.action = source["action"];
	        this.downloaderType = source["downloaderType"];
	        this.useBitsPerSecond = source["useBitsPerSecond"];
	        this.sampleIntervalSeconds = source["sampleIntervalSeconds"];
	        this.pauseWhenTrackedAppsRunning = source["pauseWhenTrackedAppsRunning"];
	        this.trackedApps = source["trackedApps"];
	    }
	}
	export class StatusDTO {
	    running: boolean;
	    state: string;
	    countdownSeconds: number;
	    trackedAppRunning: boolean;
	
	    static createFrom(source: any = {}) {
	        return new StatusDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.running = source["running"];
	        this.state = source["state"];
	        this.countdownSeconds = source["countdownSeconds"];
	        this.trackedAppRunning = source["trackedAppRunning"];
	    }
	}

}

