/**
 * Default Status Codes for systemVariables, define the UI appereance and behaviour of the variable.
 * They are simple strings and can be extended with custom statuses.
 */
export var VarStatusCodes;
(function (VarStatusCodes) {
    /** The variable is subscribed for receiving updates. This is the default "ALL GOOD". */
    VarStatusCodes["Subscribed"] = "SUBSCRIBED";
    /**Something went wrong in retrieving the variable serverside, like for example the variable does not exist or
     * is corrupted, in general an action by the admin must be taken to fix this. The user should not be able to
     * interact with the item. The variable is not subscribed. Its value, if any, should not be trusted.
     */
    VarStatusCodes["Error"] = "ERROR";
    /**Loading... The variable is waiting to be written or being subscribed. Usefull to show some related UI. */
    VarStatusCodes["Pending"] = "PENDING";
    /**The variable value is within some "DANGER" zone. Used to show variable related alarms. */
    VarStatusCodes["Warning"] = "WARNING";
    /**The variable is ok, but will not receive updates for some reasons, for example no network.
     * One can trust the variable value as its last updated value.*/
    VarStatusCodes["Unsubscribed"] = "UNSUBSCRIBED";
})(VarStatusCodes || (VarStatusCodes = {}));
export var ErrorCodes;
(function (ErrorCodes) {
    /**Variable was not found in server */
    ErrorCodes["VarNotExist"] = "NOT-EXIST";
    ErrorCodes["WontSubcribe"] = "WONT-SUB";
    ErrorCodes["CantSubcribe"] = "CANT-SUB";
    ErrorCodes["CantUnSubcribe"] = "CANT-UNSUB";
    /**Provided Write Request value has wrong type or could not be understood */
    ErrorCodes["BadValue"] = "BAD-VALUE";
    /**Network is down, cannot retrieve values */
    ErrorCodes["NoNetwork"] = "NO-NETWORK";
    /**Action cannot be performed, user has no rights. */
    ErrorCodes["Unauthorized"] = "UNAUTHORIZED";
    /**Serverside bug? */
    ErrorCodes["ServerError"] = "SERVER-ERROR";
    ErrorCodes["UnknownError"] = "UKNOWN";
})(ErrorCodes || (ErrorCodes = {}));
export var Actions;
(function (Actions) {
    Actions["Write"] = "WRITE";
    Actions["Read"] = "READ";
    Actions["Subscribe"] = "SUBSCRIBE";
    Actions["Unsubscribe"] = "UNSUBSCRIBE";
    Actions["Update"] = "UPDATE";
    Actions["Init"] = "INITIALIZE";
    Actions["Unknown"] = "UNKNOWN";
})(Actions || (Actions = {}));
export class systemError {
    constructor(sysName, Code, target = "", Action = "") {
        // if(!(err && typeof err.code === "string")) throw TypeError("Err must be valid and of 'basicError' type: {code:string,message?:string}");
        if (typeof Code !== "string")
            throw TypeError("Code must be a string");
        if (typeof sysName !== "string")
            throw TypeError("sysName must be a string");
        //this.code = err.code;
        this.code = Code;
        this.timestamp_ms = Date.now();
        this.systemName = sysName;
        this.action = Action || "";
        this.targetName = target || "";
        this.ack = false;
        //this.message = err.message ? err.message : this.buildDefaultMessage();
        this.message = this.buildDefaultMessage();
    }
    buildDefaultMessage() {
        let message = `Error in system (${this.systemName})`;
        if (this.action !== "")
            message += ` during ${this.action}`;
        if (this.targetName !== "")
            message += ` on target (${this.targetName})`;
        message += `. Error Code: ${this.code}.`;
        return message;
    }
}
export class systemAlarm extends systemError {
    constructor(sysName, Code, target, Action = "") {
        super(sysName, Code, target, Action);
        this.isActive = true;
    }
    buildDefaultMessage() {
        let message = `Alarm in system (${this.systemName})`;
        if (this.action !== "")
            message += ` during ${this.action}`;
        if (this.targetName !== "")
            message += ` on target (${this.targetName})`;
        message += `. Alarm Code: ${this.code}.`;
        return message;
    }
}
/**
 * Defines a generic variable bound to a specific system.
 * The "value" must be a JSON compatible object, since these values are
 * persisted in localstorage. So anything is good but functions.
 */
export class systemVariable {
    constructor(_name) {
        this.name = _name;
        this.value = null;
        this.status = null;
    }
}
export class SubscribeResp {
    constructor(Success, name, value = null) {
        this.error = null;
        this.success = Success;
        this.varName = name;
        this.varValue = value;
    }
    setError(ErrorCode, Message = "") {
        this.error = {
            code: ErrorCode,
            message: Message
        };
    }
}
