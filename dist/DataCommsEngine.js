import { Manager } from './ServiceManager.js';
import { ServiceStatusCodes, systemVariable, Actions, VarStatusCodes, ErrorCodes, systemError } from './Types.js';
/**Abstract class defining a Comunication Engine for data I/O with a server.*/
export class DataCommsEngine {
    constructor(systemName) {
        this.manager = Manager;
        this.name = "DataEngine";
        this.status = ServiceStatusCodes.Down;
        /**
         * Variables waiting to be subscribed for updates. It is a key-number map.
         * The number represent how many UI element times requested updates from that variable.
         * Variables are purged once subscribed. If subscription fails with "NO-NET"
         * or "CANT-SUB" error the var is kept for later subscription,
         * if fails with "WONT-SUB" or "NOT-EXIST" it will be purged from list.
        */
        this.toBeSubscribed = new Map();
        /**
         * List of Variables waiting to be unsubscribed from updates.
         */
        this.toBeUnsubscribed = new Set();
        /**
         * List of Variables currently subscribed for updates. It is a key-number map.
         * The number represent the number of UI-elements registered with the same variable,
         * usually one, but for special cases could be more.
         */
        this.subscribedVar = new Map();
        this.sub_timerID = null;
        this.unsub_timerID = null;
        /**
         * Time the system will wait before sending subscruiption/unsubscription, so that variable
         * can be aggregated and make moreefficient network calls.
         */
        this.aggregationTime_ms = 10;
        this.system = systemName;
        this.VarDispatchErrorCases = [
            ErrorCodes.VarNotExist, ErrorCodes.WontSubcribe, ErrorCodes.Unauthorized,
            ErrorCodes.UnknownError, ErrorCodes.CantUnSubcribe
        ];
        this.VarErrorNoActCases = [ErrorCodes.BadValue, ErrorCodes.CantUnSubcribe,
            ErrorCodes.Unauthorized];
        this.VarErrorUnsubCases = [ErrorCodes.CantSubcribe, ErrorCodes.NoNetwork];
    }
    RequestSubscription(target) {
        let count = this.toBeSubscribed.get(target.name) || 0;
        this.toBeSubscribed.set(target.name, count + 1);
        // this case just fill the subscribelist,willbe submitted after init
        if (this.status === ServiceStatusCodes.Down ||
            this.status === ServiceStatusCodes.Warming)
            return;
        if (this.sub_timerID)
            clearTimeout(this.sub_timerID);
        this.sub_timerID = setTimeout(this._subcribe.bind(this), this.aggregationTime_ms);
    }
    RequestUnsubscription(target) {
        if (!this.subscribedVar.has(target.name))
            throw Error("CANNOT UNSUBSCRIBE variable " + target.name);
        let count = this.subscribedVar.get(target.name);
        if (count > 1) {
            // the variable needs to remain subscribed untill there 
            // are related UI element connected
            this.subscribedVar.set(target.name, count - 1);
            return;
        }
        this.toBeUnsubscribed.add(target.name);
        if (this.unsub_timerID)
            clearTimeout(this.unsub_timerID);
        this.unsub_timerID = setTimeout(this._unsubcribe.bind(this), this.aggregationTime_ms);
    }
    async _subcribe() {
        let response = await this.Subscribe(Array.from(this.toBeSubscribed.keys()));
        this.updateSubscriberLists(response);
        this.UpdateVars(response, VarStatusCodes.Subscribed, Actions.Subscribe);
    }
    updateSubscriberLists(response) {
        for (let rsp of response) {
            if (rsp.success) {
                let count = this.toBeSubscribed.get(rsp.varName);
                count += (this.subscribedVar.get(rsp.varName) || 0);
                this.subscribedVar.set(rsp.varName, count);
                this.toBeSubscribed.delete(rsp.varName);
            }
            else {
                let code = rsp.error ? rsp.error.code : ErrorCodes.UnknownError;
                // keep in list for next try later in case of these errors
                if (code !== ErrorCodes.NoNetwork && code !== ErrorCodes.CantSubcribe)
                    this.toBeSubscribed.delete(rsp.varName);
            }
        }
    }
    UpdateVars(response, ok_status, action = "") {
        let var_upd = [];
        for (let rsp of response) {
            let varName = rsp.varName;
            let var_idx = new systemVariable(varName);
            if (rsp.success) {
                var_idx.status = ok_status;
                if (rsp.varValue)
                    var_idx.value = rsp.varValue;
            }
            else {
                let code = rsp.error ? rsp.error.code : ErrorCodes.UnknownError;
                if (this.VarDispatchErrorCases.includes(code))
                    this.manager.CreateAndDispatchError(this.system, code, varName, action);
                if (this.VarErrorUnsubCases.includes(code))
                    var_idx.status = VarStatusCodes.Unsubscribed;
                else if (this.VarErrorNoActCases.includes(code)) // no modify status, unless is "pending"
                 {
                    let _var = this.manager.dataTree.GetVar({ system: this.system, name: varName });
                    var_idx.status = _var.status === VarStatusCodes.Pending ? VarStatusCodes.Subscribed : null;
                }
                else
                    var_idx.status = VarStatusCodes.Error;
            }
            var_upd.push(var_idx);
        }
        this.manager.Update(this.system, var_upd);
    }
    async _unsubcribe() {
        let response = await this.Unsubscribe(Array.from(this.toBeUnsubscribed));
        for (let rsp of response) {
            if (rsp.success)
                this.subscribedVar.delete(rsp.varName);
            this.toBeUnsubscribed.delete(rsp.varName);
        }
        this.UpdateVars(response, VarStatusCodes.Unsubscribed, Actions.Unsubscribe);
    }
    async _init() {
        this.status = ServiceStatusCodes.Warming;
        let resp = await this.Initialize();
        if (resp.success)
            this.status = ServiceStatusCodes.Ready;
        else {
            this.status = ServiceStatusCodes.Error;
            let code = resp.error ? resp.error.code : ErrorCodes.UnknownError;
            let err = new systemError(this.name, code, this.name, Actions.Init);
            this.manager.DispatchError(err);
        }
        if (this.toBeSubscribed.size > 0)
            this._subcribe();
    }
    /**
     * Action Update. It updates a list of variable values and statuses in the DataManager.
     * The updates will be automatically dispatched to all UI component connected to those variables.
     * @param data A list of variable updates, properties (like status or value) that are null will not be updated.
     */
    UpdateData(data) {
        this.manager.Update(this.system, data);
    }
}
