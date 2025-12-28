export namespace terminal {
	
	export class SessionMetadata {
	    workingDirectory: string;
	    shell: string;
	    environment: Record<string, string>;
	    connectionID?: string;
	    // Go type: time
	    createdAt: any;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new SessionMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.workingDirectory = source["workingDirectory"];
	        this.shell = source["shell"];
	        this.environment = source["environment"];
	        this.connectionID = source["connectionID"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.state = source["state"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

